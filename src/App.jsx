import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Login from "./pages/Login";
import Home from "./pages/home";
import "./App.css";

const API_BASE = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_URL || "https://task-manager-6wdd.onrender.com");

const API_URL = `${API_BASE}/api/tasks`;
const COLLAB_URL = `${API_BASE}/api/collaborations`;
const DEFAULT_TOPIC = "General";

function normalizeTopic(topic) {
  return topic && topic.trim() ? topic.trim() : DEFAULT_TOPIC;
}

function sortByDueDate(a, b) {
  // 1. Completed tasks are shown very last
  if (a.completed !== b.completed) {
    return a.completed ? 1 : -1;
  }

  // 2. Tasks with due dates are shown first (priority), sorted ascending by due date
  const hasDueA = !!a.dueDate;
  const hasDueB = !!b.dueDate;
  if (hasDueA !== hasDueB) {
    return hasDueA ? -1 : 1;
  }

  if (hasDueA) {
    const timeA = new Date(a.dueDate).getTime();
    const timeB = new Date(b.dueDate).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
  } else {
    // 3. Tasks with no due date: recently added as last (ascending order of createdAt)
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }
  }

  return 0;
}

function withSubmittedDueDate(taskItem, submittedDueDate) {
  if (!submittedDueDate || taskItem.dueDate) return taskItem;
  return { ...taskItem, dueDate: submittedDueDate };
}

function App() {
  const [task, setTask] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [topic, setTopic] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [customTopics, setCustomTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  // Collaboration state
  const [collaborations, setCollaborations] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const getUser = () => JSON.parse(sessionStorage.getItem("user"));

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const user = getUser();
        const res = await axios.get(API_URL, {
          params: { userId: user.id }
        });
        setTasks(res.data);
        setStatus("ready");
      } catch (err) {
        setError("Could not load tasks. Make sure the backend is running.");
        setStatus("error");
        console.log(err);
      }
    };

    const fetchCollaborations = async () => {
      try {
        const user = getUser();
        const res = await axios.get(COLLAB_URL, {
          params: { userId: user.id }
        });
        setCollaborations(res.data);
      } catch (err) {
        console.log("Could not load collaborations:", err.message);
      }
    };

    const fetchInvitations = async () => {
      try {
        const user = getUser();
        const res = await axios.get(`${COLLAB_URL}/invitations`, {
          params: { userId: user.id }
        });
        setInvitations(res.data);
      } catch (err) {
        console.log("Could not load invitations:", err.message);
      }
    };

    fetchTasks();
    fetchCollaborations();
    fetchInvitations();
  }, []);

  const topics = useMemo(() => {
    const topicNames = tasks.map((item) => normalizeTopic(item.topic));
    const collabTopics = collaborations.map(c => c.topicName);
    return [...new Set([DEFAULT_TOPIC, ...customTopics, ...topicNames, ...collabTopics])];
  }, [customTopics, tasks, collaborations]);

  const selectedTasks = useMemo(() => tasks
    .filter((item) => normalizeTopic(item.topic) === selectedTopic)
    .sort(sortByDueDate), [selectedTopic, tasks]);

  // Find collaboration for selected topic
  const selectedCollab = useMemo(() => {
    return collaborations.find(c => c.topicName === selectedTopic) || null;
  }, [collaborations, selectedTopic]);

  const addTask = async (customText, customTopic, customDueDate) => {
    const text = typeof customText === "string" ? customText.trim() : task.trim();
    const user = getUser();
    const nextTopic = normalizeTopic(typeof customTopic === "string" ? customTopic : topic);
    if (!text) return;

    try {
      const submittedDueDate = typeof customDueDate === "string" ? customDueDate : dueDate;
      const res = await axios.post(API_URL, {
        text,
        topic: nextTopic,
        dueDate: submittedDueDate || undefined,
        userId: user.id
      });
      setTasks((currentTasks) => [withSubmittedDueDate(res.data, submittedDueDate), ...currentTasks]);
      setSelectedTopic(nextTopic);
      if (customText === undefined) {
        setTask("");
        setDueDate("");
      }
      setTopic(nextTopic);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Task was not added. Please try again.");
      console.log(err);
    }
  };

  const addTopic = (customTopicName) => {
    const nextTopic = normalizeTopic(typeof customTopicName === "string" ? customTopicName : newTopic);
    setCustomTopics((currentTopics) =>
      currentTopics.includes(nextTopic) ? currentTopics : [...currentTopics, nextTopic]
    );
    setSelectedTopic(nextTopic);
    setTopic(nextTopic);
    if (customTopicName === undefined) {
      setNewTopic("");
    }
  };

  const editTopic = async (oldTopic, nextTopicName) => {
    const currentTopic = normalizeTopic(oldTopic);
    const nextTopic = normalizeTopic(nextTopicName);
    if (!nextTopic || currentTopic === nextTopic) return;

    try {
      const user = getUser();
      await axios.patch(`${API_URL}/topic`, {
        oldTopic: currentTopic,
        newTopic: nextTopic,
        userId: user.id
      });
      setTasks((currentTasks) => currentTasks.map((item) =>
        normalizeTopic(item.topic) === currentTopic ? { ...item, topic: nextTopic } : item
      ));
      setCustomTopics((currentTopics) => [...new Set(currentTopics.map((item) =>
        item === currentTopic ? nextTopic : item
      ))]);
      setCollaborations(prev => prev.map(c =>
        c.topicName === currentTopic ? { ...c, topicName: nextTopic } : c
      ));
      setSelectedTopic(nextTopic);
      setTopic(nextTopic);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not rename this topic.");
      console.log(err);
    }
  };

  const toggleTask = async (id) => {
    const selectedTask = tasks.find((item) => item._id === id);
    if (!selectedTask) return;

    try {
      const user = getUser();
      const res = await axios.put(`${API_URL}/${id}`, {
        completed: !selectedTask.completed,
        userId: user.id,
        userName: user.name || user.email || "Unknown"
      });
      setTasks((currentTasks) =>
        currentTasks.map((item) => (item._id === id ? res.data : item))
      );
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update this task.");
      console.log(err);
    }
  };

  const deleteTask = async (id) => {
    try {
      const user = getUser();
      await axios.delete(`${API_URL}/${id}`, {
        data: { userId: user.id }
      });
      setTasks((currentTasks) => currentTasks.filter((item) => item._id !== id));
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete this task.");
      console.log(err);
    }
  };

  const editTask = async (id, newText) => {
    const text = newText.trim();
    if (!text) return;

    try {
      const user = getUser();
      const res = await axios.put(`${API_URL}/${id}`, {
        text,
        userId: user.id
      });
      setTasks((currentTasks) =>
        currentTasks.map((item) => item._id === id ? res.data : item)
      );
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save your edit.");
      console.log(err);
    }
  };

  const updateTaskDetails = async (id, changes) => {
    try {
      const user = getUser();
      const res = await axios.put(`${API_URL}/${id}`, {
        ...changes,
        userId: user.id
      });
      setTasks((currentTasks) =>
        currentTasks.map((item) => {
          if (item._id !== id) return item;
          if (!Object.prototype.hasOwnProperty.call(changes, "dueDate")) return res.data;
          if (changes.dueDate) return withSubmittedDueDate(res.data, changes.dueDate);
          return { ...res.data, dueDate: undefined };
        })
      );
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update this task.");
      console.log(err);
    }
  };

  const updateTaskReminder = async (id, reminderData) => {
    try {
      const user = getUser();
      const res = await axios.put(`${API_BASE}/api/tasks/${id}/reminder`, {
        ...reminderData,
        userId: user.id
      });
      setTasks((currentTasks) =>
        currentTasks.map((item) => (item._id === id ? res.data : item))
      );
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update reminder.");
      console.log(err);
    }
  };

  const deleteTopic = async () => {
    try {
      const user = getUser();
      await axios.delete(API_URL, {
        params: {
          topic: selectedTopic,
          userId: user.id
        }
      });
      setTasks((currentTasks) =>
        currentTasks.filter((item) => normalizeTopic(item.topic) !== selectedTopic)
      );
      setCustomTopics((currentTopics) =>
        currentTopics.filter((t) => normalizeTopic(t) !== selectedTopic)
      );
      setCollaborations((prev) =>
        prev.filter((c) => c.topicName !== selectedTopic)
      );
      setSelectedTopic("");
      setTopic("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete this topic.");
      console.log(err);
    }
  };

  // ---- Collaboration actions ----

  const shareTopicAsCollab = async (topicName) => {
    try {
      const user = getUser();
      const res = await axios.post(COLLAB_URL, {
        topicName,
        ownerId: user.id
      });
      setCollaborations(prev => {
        const exists = prev.find(c => c._id === res.data._id);
        return exists ? prev.map(c => c._id === res.data._id ? res.data : c) : [...prev, res.data];
      });
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || "Could not share topic.");
      throw err;
    }
  };

  const inviteMember = async (collabId, email) => {
    const user = getUser();
    const res = await axios.post(`${COLLAB_URL}/${collabId}/invite`, {
      email,
      userId: user.id
    });
    setCollaborations(prev =>
      prev.map(c => c._id === collabId ? res.data : c)
    );
    return res.data;
  };

  const removeMember = async (collabId, memberId) => {
    const user = getUser();

    // Find the collab before deleting so we know its topicName
    const leavingCollab = collaborations.find(c => c._id === collabId);

    const res = await axios.delete(`${COLLAB_URL}/${collabId}/members/${memberId}`, {
      data: { userId: user.id }
    });

    setCollaborations(prev => {
      if (memberId === user.id) {
        // Self-leave: remove collab entirely so topic disappears from sidebar
        return prev.filter(c => c._id !== collabId);
      }
      // Owner removing someone else: update the collab entry
      return prev.map(c => c._id === collabId ? res.data : c);
    });

    // If the current user left (self-leave), remove that topic's tasks from local state
    if (memberId === user.id && leavingCollab) {
      const topicName = leavingCollab.topicName;
      setTasks(prev => prev.filter(t => normalizeTopic(t.topic) !== topicName));
    }

    return res.data;
  };

  const acceptInvitation = async (collabId) => {
    const user = getUser();
    try {
      const res = await axios.post(`${COLLAB_URL}/${collabId}/accept`, {
        userId: user.id
      });
      setCollaborations(prev => [...prev, res.data]);
      setInvitations(prev => prev.filter(i => i._id !== collabId));
      const tasksRes = await axios.get(API_URL, {
        params: { userId: user.id }
      });
      setTasks(tasksRes.data);
    } catch (err) {
      console.log("Could not accept invitation:", err.message);
      setError("Could not accept invitation.");
    }
  };

  const declineInvitation = async (collabId) => {
    const user = getUser();
    try {
      await axios.post(`${COLLAB_URL}/${collabId}/decline`, {
        userId: user.id
      });
      setInvitations(prev => prev.filter(i => i._id !== collabId));
    } catch (err) {
      console.log("Could not decline invitation:", err.message);
      setError("Could not decline invitation.");
    }
  };

  if (!sessionStorage.getItem("token")) {
    return <Login />;
  }

  const user = getUser();

  return (
    <Home
      task={task}
      setTask={setTask}
      dueDate={dueDate}
      setDueDate={setDueDate}
      topic={topic}
      setTopic={setTopic}
      newTopic={newTopic}
      setNewTopic={setNewTopic}
      selectedTopic={selectedTopic}
      setSelectedTopic={setSelectedTopic}
      topics={topics}
      addTopic={addTopic}
      editTopic={editTopic}
      addTask={addTask}
      tasks={selectedTasks}
      allTasks={tasks}
      toggleTask={toggleTask}
      deleteTask={deleteTask}
      editTask={editTask}
      updateTaskDetails={updateTaskDetails}
      updateTaskReminder={updateTaskReminder}
      deleteTopic={deleteTopic}
      status={status}
      error={error}
      currentUser={user}
      collaborations={collaborations}
      selectedCollab={selectedCollab}
      shareTopicAsCollab={shareTopicAsCollab}
      inviteMember={inviteMember}
      removeMember={removeMember}
      invitations={invitations}
      acceptInvitation={acceptInvitation}
      declineInvitation={declineInvitation}
    />
  );
}

export default App;
