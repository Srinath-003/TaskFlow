import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Login from "./pages/Login";
import Header from "./components/header";
import Home from "./pages/home";
import "./App.css";

const API_URL = "/api/tasks";
const DEFAULT_TOPIC = "General";

function normalizeTopic(topic) {
  return topic && topic.trim() ? topic.trim() : DEFAULT_TOPIC;
}

function App() {
  const [task, setTask] = useState("");
  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [newTopic, setNewTopic] = useState("");
  const [customTopics, setCustomTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(DEFAULT_TOPIC);
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

  const selectedTasks = tasks.filter(
    (item) => normalizeTopic(item.topic) === selectedTopic
  );

  const addTask = async () => {
    const text = task.trim();
    const user = JSON.parse(sessionStorage.getItem("user"));
    const nextTopic = normalizeTopic(topic);
    if (!text) return;

    try {
      const res = await axios.post(API_URL, {
  text,
  topic: nextTopic,
  userId: user.id
});
      setTasks((currentTasks) => [res.data, ...currentTasks]);
      setSelectedTopic(nextTopic);
      setTask("");
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
      await axios.patch(`${API_URL}/topic`, {
        oldTopic: currentTopic,
        newTopic: nextTopic
      });

      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          normalizeTopic(item.topic) === currentTopic
            ? { ...item, topic: nextTopic }
            : item
        )
      );
      setCustomTopics((currentTopics) => {
        const renamedTopics = currentTopics.map((item) =>
          item === currentTopic ? nextTopic : item
        );

        return renamedTopics.includes(nextTopic)
          ? [...new Set(renamedTopics)]
          : [...new Set([...renamedTopics, nextTopic])];
      });
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
      const res = await axios.put(`${API_URL}/${id}`, {
        completed: !selectedTask.completed
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
      await axios.delete(`${API_URL}/${id}`);
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
      const res = await axios.put(`${API_URL}/${id}`, { text });
      setTasks((currentTasks) =>
        currentTasks.map((item) => (item._id === id ? res.data : item))
      );
      setError("");
    } catch (err) {
      setError("Could not save your edit.");
      console.log(err);
    }
  };

  const clearTopic = async () => {
    if (selectedTasks.length === 0) return;

    try {
      await axios.delete(API_URL, { params: { topic: selectedTopic } });
      setTasks((currentTasks) =>
        currentTasks.filter((item) => normalizeTopic(item.topic) !== selectedTopic)
      );
      setError("");
    } catch (err) {
      setError("Could not clear this topic.");
      console.log(err);
    }
  };

  const completedCount = selectedTasks.filter((item) => item.completed).length;
  const activeCount = selectedTasks.length - completedCount;
if (!sessionStorage.getItem("token")) {
  return <Login />;
}


return (
  <div className="app-shell">
    <Header />

    <Home
      task={task}
      setTask={setTask}
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
      clearTopic={clearTopic}
      status={status}
      error={error}
      activeCount={activeCount}
      completedCount={completedCount}
    />
  </div>
);
}

export default App;
