const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Task = require("../models/Task");

const getTopicFilter = (topic) => {
  if (!topic) return {};
  if (topic === "General") return { $or: [{ topic }, { topic: { $exists: false } }] };
  return { topic };
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

// GET all tasks
router.get("/", async (req, res) => {
  try {
    const filter = getTopicFilter(req.query.topic);
    const tasks = await Task.find(filter).sort({ _id: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks", error: err.message });
  }
});

// ADD task
router.post("/", async (req, res) => {
  try {
    const text = req.body.text && req.body.text.trim();
    const topic = req.body.topic && req.body.topic.trim() ? req.body.topic.trim() : "General";

    if (!text) {
      return res.status(400).json({ message: "Task text is required" });
    }

    const newTask = new Task({ text, topic });
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(500).json({ message: "Failed to create task", error: err.message });
  }
});

// DELETE all tasks
router.delete("/", async (req, res) => {
  try {
    const filter = getTopicFilter(req.query.topic);
    await Task.deleteMany(filter);
    res.json({ message: req.query.topic ? "Topic tasks deleted" : "All tasks deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear tasks", error: err.message });
  }
});

// RENAME topic
router.patch("/topic", async (req, res) => {
  try {
    const oldTopic = req.body.oldTopic && req.body.oldTopic.trim();
    const newTopic = req.body.newTopic && req.body.newTopic.trim();

    if (!oldTopic || !newTopic) {
      return res.status(400).json({ message: "Old and new topic names are required" });
    }

    const result = await Task.updateMany(getTopicFilter(oldTopic), { topic: newTopic });
    res.json({ message: "Topic renamed", modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: "Failed to rename topic", error: err.message });
  }
});

// DELETE task
router.delete("/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete task", error: err.message });
  }
});

// UPDATE task
router.put("/:id", async (req, res) => {
  try {
    const update = {};

    if (typeof req.body.text === "string") {
      update.text = req.body.text.trim();
    }

    if (typeof req.body.topic === "string" && req.body.topic.trim()) {
      update.topic = req.body.topic.trim();
    }

    if (typeof req.body.completed === "boolean") {
      update.completed = req.body.completed;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: "Failed to update task", error: err.message });
  }
});

module.exports = router;
