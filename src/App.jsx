import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Login from "./pages/Login";
import Header from "./components/header";
import Home from "./pages/home";
import "./App.css";

const API_URL = "https://task-manager-6wdd.onrender.com/api/tasks";
const DEFAULT_TOPIC = "General";

function normalizeTopic(topic) {
  return topic && topic.trim() ? topic.trim() : DEFAULT_TOPIC;
}

function getDueTime(taskItem) {
  if (!taskItem.dueDate) return Number.POSITIVE_INFINITY;

  const time = new Date(taskItem.dueDate).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function sortByDueDate(a, b) {
  const aTime = getDueTime(a);
  const bTime = getDueTime(b);

  if (aTime === bTime) return 0;
  return aTime - bTime;
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
  // Start on the topics screen so a person can choose where they want to work.
  const [selectedTopic, setSelectedTopic] = useState("");
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTasks = async () => {
  try {
    const user = JSON.parse(sessionStorage.getItem("user"));

    const res = await axios.get(API_URL, {
      params: {
        userId: user.id
      }
    });

    setTasks(res.data);
    setStatus("ready");
  } catch (err) {
    setError("Could not load tasks. Make sure the backend is running.");
    setStatus("error");
    console.log(err);
  }
};

    fetchTasks();
  }, []);

  const topics = useMemo(() => {
    const topicNames = tasks.map((item) => normalizeTopic(item.topic));
    return [...new Set([DEFAULT_TOPIC, ...customTopics, ...topicNames])];
  }, [customTopics, tasks]);

  const selectedTasks = useMemo(() => tasks
    .filter((item) => normalizeTopic(item.topic) === selectedTopic)
    .sort(sortByDueDate), [selectedTopic, tasks]);

  const addTask = async () => {
    const text = task.trim();
    const user = JSON.parse(sessionStorage.getItem("user"));
    const nextTopic = normalizeTopic(topic);
    if (!text) return;

    try {
      const submittedDueDate = dueDate;
      const res = await axios.post(API_URL, {
  text,
  topic: nextTopic,
  dueDate: submittedDueDate || undefined,
  userId: user.id
});
      setTasks((currentTasks) => [withSubmittedDueDate(res.data, submittedDueDate), ...currentTasks]);
      setSelectedTopic(nextTopic);
      setTask("");
      setDueDate("");
      setTopic(nextTopic);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Task was not added. Please try again.");
      console.log(err);
    }
  };

  const addTopic = () => {
    const nextTopic = normalizeTopic(newTopic);
    setCustomTopics((currentTopics) =>
      currentTopics.includes(nextTopic) ? currentTopics : [...currentTopics, nextTopic]
    );
    setSelectedTopic(nextTopic);
    setTopic(nextTopic);
    setNewTopic("");
  };

  const editTopic = async (oldTopic, nextTopicName) => {
    const currentTopic = normalizeTopic(oldTopic);
    const nextTopic = normalizeTopic(nextTopicName);
    if (!nextTopic || currentTopic === nextTopic) return;

    try {
      const user = JSON.parse(sessionStorage.getItem("user"));
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
      setSelectedTopic(nextTopic);
      setTopic(nextTopic);
      setError("");
    } catch (err) {
      setError("Could not rename this topic.");
      console.log(err);
    }
  };

  const toggleTask = async (id) => {
    const selectedTask = tasks.find((item) => item._id === id);
    if (!selectedTask) return;

    try {
      const user = JSON.parse(sessionStorage.getItem("user"));

const res = await axios.put(`${API_URL}/${id}`, {
  completed: !selectedTask.completed,
  userId: user.id
});

      setTasks((currentTasks) =>
        currentTasks.map((item) => (item._id === id ? res.data : item))
      );
      setError("");
    } catch (err) {
      setError("Could not update this task.");
      console.log(err);
    }
  };

  const deleteTask = async (id) => {
    try {
      const user = JSON.parse(sessionStorage.getItem("user"));

await axios.delete(`${API_URL}/${id}`, {
  data: {
    userId: user.id
  }
});
      setTasks((currentTasks) => currentTasks.filter((item) => item._id !== id));
      setError("");
    } catch (err) {
      setError("Could not delete this task.");
      console.log(err);
    }
  };

  const editTask = async (id, newText) => {
    const text = newText.trim();
    if (!text) return;

    try {
      const user = JSON.parse(sessionStorage.getItem("user"));

const res = await axios.put(`${API_URL}/${id}`, {
  text,
  userId: user.id
});

setTasks((currentTasks) =>
  currentTasks.map((item) =>
    item._id === id ? res.data : item
  )
);

setError("");
    } catch (err) {
      setError("Could not save your edit.");
      console.log(err);
    }
  };

  const updateTaskDetails = async (id, changes) => {
    try {
      const user = JSON.parse(sessionStorage.getItem("user"));

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
      setError("Could not update this task.");
      console.log(err);
    }
  };

  const clearTopic = async () => {
    if (selectedTasks.length === 0) return;

    try {
      const user = JSON.parse(sessionStorage.getItem("user"));
      await axios.delete(API_URL, {
        params: {
          topic: selectedTopic,
          userId: user.id
        }
      });
      setTasks((currentTasks) =>
        currentTasks.filter((item) => normalizeTopic(item.topic) !== selectedTopic)
      );
      setError("");
    } catch (err) {
      setError("Could not clear this topic.");
      console.log(err);
    }
  };

if (!sessionStorage.getItem("token")) {
  return <Login />;
}


return (
  <div className="app-shell">
    <Header />

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
      clearTopic={clearTopic}
      status={status}
      error={error}
    />
  </div>
);
}

export default App;
