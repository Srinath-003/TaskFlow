const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Task = require("../models/Task");
const Collaboration = require("../models/Collaboration");

const getTopicFilter = (topic) => {
  if (!topic) return {};
  if (topic === "General") return { $or: [{ topic }, { topic: { $exists: false } }] };
  return { topic };
};

const MAX_DUE_DATE = new Date("9999-12-31");

const parseDueDate = (value) => {
  if (typeof value !== "string" || !value) return undefined;

  if (value.includes("T")) {
    const dueDate = new Date(value);
    return Number.isNaN(dueDate.getTime()) ? undefined : dueDate;
  }

  const dueDate = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(dueDate.getTime()) ? undefined : dueDate;
};

router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database is not connected",
      error: "MongoDB Atlas connection is not ready"
    });
  }

  next();
});

// GET all tasks (supporting collaborations)
router.get("/", async (req, res) => {
  try {
    const { userId, topic } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }

    // Get all collaborations the user is part of
    const collabs = await Collaboration.find({ "members.userId": userId });

    let query = {};
    if (topic) {
      // Fetching a specific topic
      const collab = collabs.find(c => c.topicName === topic);
      if (collab) {
        // Collaborative topic: return tasks with this topic name created by any member of the collaboration
        const memberIds = collab.members.map(m => m.userId);
        query = {
          topic,
          userId: { $in: memberIds }
        };
      } else {
        // Private topic: return only current user's tasks with this topic
        query = {
          ...getTopicFilter(topic),
          userId
        };
      }
    } else {
      // Fetching all tasks (e.g. for My Tasks / Dashboard)
      // This includes all private tasks of the user, plus any tasks in shared topics
      const clauses = [{ userId }];
      for (const collab of collabs) {
        const memberIds = collab.members.map(m => m.userId);
        clauses.push({
          topic: collab.topicName,
          userId: { $in: memberIds }
        });
      }
      query = { $or: clauses };
    }

    const tasks = await Task.aggregate([
      { $match: query },
      {
        $addFields: {
          dueDateSort: { $ifNull: ["$dueDate", MAX_DUE_DATE] }
        }
      },
      { $sort: { dueDateSort: 1, _id: -1 } },
      { $project: { dueDateSort: 0 } }
    ]);

    res.json(tasks);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch tasks",
      error: err.message
    });
  }
});

// ADD task
router.post("/", async (req, res) => {
  try {
    const text = req.body.text && req.body.text.trim();
    const topic = req.body.topic && req.body.topic.trim() ? req.body.topic.trim() : "General";
    const { userId } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Task text is required" });
    }
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const newTask = new Task({
      text,
      topic,
      dueDate: parseDueDate(req.body.dueDate),
      userId
    });
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(500).json({ message: "Failed to create task", error: err.message });
  }
});

// DELETE topic (deletes all tasks, and deletes collaboration if collaborative)
router.delete("/", async (req, res) => {
  try {
    const { userId, topic } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }

    if (topic) {
      // Check if this topic is collaborative
      const collab = await Collaboration.findOne({ topicName: topic });
      if (collab) {
        // Enforce Owner-only permission for deleting collaborative topic
        if (collab.ownerId !== userId) {
          return res.status(403).json({ message: "Only the topic owner can delete this collaborative topic" });
        }
        // Delete the collaboration itself
        await Collaboration.deleteOne({ _id: collab._id });

        const memberIds = collab.members.map(m => m.userId);
        await Task.deleteMany({
          topic,
          userId: { $in: memberIds }
        });
      } else {
        // Private topic
        await Task.deleteMany({
          ...getTopicFilter(topic),
          userId
        });
      }
    } else {
      // Clear all private tasks of the user
      await Task.deleteMany({ userId });
    }

    res.json({ message: topic ? "Topic tasks deleted" : "All tasks deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear tasks", error: err.message });
  }
});

// RENAME topic
router.patch("/topic", async (req, res) => {
  try {
    const oldTopic = req.body.oldTopic && req.body.oldTopic.trim();
    const newTopic = req.body.newTopic && req.body.newTopic.trim();
    const { userId } = req.body;

    if (!oldTopic || !newTopic || !userId) {
      return res.status(400).json({ message: "oldTopic, newTopic, and userId are required" });
    }

    // Check if the topic is collaborative
    const collab = await Collaboration.findOne({ topicName: oldTopic });
    if (collab) {
      // Enforce Owner-only permission
      if (collab.ownerId !== userId) {
        return res.status(403).json({ message: "Only the topic owner can rename this collaborative topic" });
      }

      // Rename collaboration document
      collab.topicName = newTopic;
      await collab.save();

      // Rename all tasks of all members under this topic
      const memberIds = collab.members.map(m => m.userId);
      const result = await Task.updateMany(
        { topic: oldTopic, userId: { $in: memberIds } },
        { topic: newTopic }
      );
      res.json({ message: "Collaborative topic renamed", modifiedCount: result.modifiedCount });
    } else {
      // Private topic
      const result = await Task.updateMany(
        {
          ...getTopicFilter(oldTopic),
          userId
        },
        { topic: newTopic }
      );
      res.json({ message: "Topic renamed", modifiedCount: result.modifiedCount });
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to rename topic", error: err.message });
  }
});

// DELETE task
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ message: "userId is required to delete task" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if collaborative topic
    const collab = await Collaboration.findOne({
      topicName: task.topic,
      "members.userId": userId
    });

    const isTopicOwner = collab && collab.ownerId === userId;
    const isTaskCreator = task.userId === userId;

    if (!isTaskCreator && !isTopicOwner) {
      return res.status(403).json({
        message: "You do not have permission to delete this task"
      });
    }

    await Task.findByIdAndDelete(id);
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete task",
      error: err.message
    });
  }
});

// UPDATE task (supporting permissions)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({ message: "userId is required to update task" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if collaborative topic
    const collab = await Collaboration.findOne({
      topicName: task.topic,
      "members.userId": userId
    });

    const isTopicOwner = collab && collab.ownerId === userId;
    const isTaskCreator = task.userId === userId;
    const isAuthorizedToEditAll = isTaskCreator || isTopicOwner;

    if (!isAuthorizedToEditAll) {
      // Check if user is a member of the collaborative topic
      const isMember = collab && collab.members.some(m => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ message: "You do not have access to this task" });
      }

      // Enforce member restriction: only allow updating "completed"
      const requestedKeys = Object.keys(req.body).filter(
        k => k !== "userId" && k !== "completed" && k !== "userName"
      );
      if (requestedKeys.length > 0) {
        return res.status(403).json({
          message: "Members cannot edit task details (only complete/incomplete)."
        });
      }
    }

    // Prepare update payload
    const update = {};
    const unset = {};

    if (typeof req.body.text === "string" && isAuthorizedToEditAll) {
      update.text = req.body.text.trim();
    }

    if (typeof req.body.topic === "string" && req.body.topic.trim() && isAuthorizedToEditAll) {
      update.topic = req.body.topic.trim();
    }

    if (typeof req.body.completed === "boolean") {
      update.completed = req.body.completed;
      if (req.body.completed) {
        update.completedBy = userId;
        update.completedByName = req.body.userName || null;
      } else {
        update.completedBy = null;
        update.completedByName = null;
      }
    }

    if (typeof req.body.dueDate === "string" && isAuthorizedToEditAll) {
      if (req.body.dueDate) {
        const dueDate = parseDueDate(req.body.dueDate);
        if (dueDate) update.dueDate = dueDate;
      } else {
        unset.dueDate = "";
      }
    }

    const updatePayload = {
      ...(Object.keys(update).length ? { $set: update } : {}),
      ...(Object.keys(unset).length ? { $unset: unset } : {})
    };

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updatePayload,
      {
        new: true,
        runValidators: true
      }
    );

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: "Failed to update task", error: err.message });
  }
});

// SET/UPDATE task reminder
router.put("/:id/reminder", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, remindAt, repeat, active } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required to update reminder" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has access to this task (creator, owner, or member of topic)
    const collab = await Collaboration.findOne({
      topicName: task.topic,
      "members.userId": userId
    });

    const isTaskCreator = task.userId === userId;
    const isTopicOwner = collab && collab.ownerId === userId;
    const isMember = collab && collab.members.some(m => m.userId === userId);

    if (!isTaskCreator && !isTopicOwner && !isMember) {
      return res.status(403).json({ message: "You do not have access to this task" });
    }

    if (!task.reminders) {
      task.reminders = [];
    }

    // Find if user already has a reminder
    const existingIndex = task.reminders.findIndex(r => r.userId === userId);

    if (active === false) {
      // Deactivate/remove
      if (existingIndex !== -1) {
        task.reminders.splice(existingIndex, 1);
      }
    } else {
      // Add or update
      if (!remindAt) {
        return res.status(400).json({ message: "remindAt is required" });
      }
      const reminder = {
        userId,
        remindAt: new Date(remindAt),
        repeat: repeat || "once",
        active: true,
        notificationSent: false
      };

      if (existingIndex !== -1) {
        task.reminders[existingIndex] = reminder;
      } else {
        task.reminders.push(reminder);
      }
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: "Failed to set reminder", error: err.message });
  }
});

module.exports = router;
