import { useState } from "react";

import Task from "../components/Task";

function Home({
  task,
  setTask,
  setTopic,
  newTopic,
  setNewTopic,
  selectedTopic,
  setSelectedTopic,
  topics,
  addTopic,
  editTopic,
  addTask,
  tasks,
  allTasks,
  toggleTask,
  deleteTask,
  editTask,
  clearTopic,
  status,
  error,
  activeCount,
  completedCount
}) {
  const totalCount = tasks.length;
  const completionRate = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const [editingTopic, setEditingTopic] = useState("");
  const [editingTopicText, setEditingTopicText] = useState("");

  const getTopicCount = (topicName) =>
    allTasks.filter((item) => (item.topic || "General") === topicName).length;

  const selectTopic = (topicName) => {
    setSelectedTopic(topicName);
    setTopic(topicName);
  };

  const startEditingTopic = (topicName) => {
    setEditingTopic(topicName);
    setEditingTopicText(topicName);
  };

  const cancelEditingTopic = () => {
    setEditingTopic("");
    setEditingTopicText("");
  };

  const saveEditingTopic = async () => {
    await editTopic(editingTopic, editingTopicText);
    cancelEditingTopic();
  };

  return (
    <main className="workspace-layout">
      <aside className="topic-sidebar">
        <div className="section-heading">
          <p className="eyebrow">Topics</p>
          <h2>Lists</h2>
        </div>

        <div className="add-topic-form">
          <input
            type="text"
            placeholder="New topic"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
            aria-label="New topic"
          />
          <button onClick={addTopic}>Add</button>
        </div>

        <div className="topic-list">
          {topics.map((topicName) => (
            <div
              key={topicName}
              className={`topic-row ${selectedTopic === topicName ? "active" : ""} ${
                editingTopic === topicName ? "editing" : ""
              }`}
            >
              {editingTopic === topicName ? (
                <>
                  <input
                    className="topic-edit-input"
                    type="text"
                    value={editingTopicText}
                    onChange={(e) => setEditingTopicText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditingTopic();
                      if (e.key === "Escape") cancelEditingTopic();
                    }}
                    aria-label={`Edit ${topicName} topic`}
                    autoFocus
                  />
                  <button className="topic-action success" onClick={saveEditingTopic}>
                    Save
                  </button>
                  <button className="topic-action" onClick={cancelEditingTopic}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="topic-button"
                    onClick={() => selectTopic(topicName)}
                  >
                    <span>{topicName}</span>
                    <small>{getTopicCount(topicName)}</small>
                  </button>
                  <button
                    className="topic-action"
                    onClick={() => startEditingTopic(topicName)}
                    aria-label={`Edit ${topicName} topic`}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      <section className="task-column">
        <div className="workspace-top">
          <div>
            <p className="eyebrow">Current list</p>
            <h2>{selectedTopic}</h2>
          </div>
          <button className="ghost-button" onClick={clearTopic} disabled={totalCount === 0}>
            Clear list
          </button>
        </div>

        <div className="quick-add">
          <input
            type="text"
            placeholder={`Add a task to ${selectedTopic}`}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            aria-label="Task text"
          />
          <button onClick={addTask}>Add task</button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="task-area">
          {status === "loading" ? (
            <p className="empty-state">Loading tasks...</p>
          ) : totalCount === 0 ? (
            <p className="empty-state">No tasks in this topic yet.</p>
          ) : (
            <ul className="task-list">
              {tasks.map((item) => (
                <Task
                  key={item._id}
                  task={item}
                  toggleTask={toggleTask}
                  deleteTask={deleteTask}
                  editTask={editTask}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside className="progress-sidebar">
        <div className="section-heading progress-heading">
          <p className="eyebrow">Progress</p>
          <h2>Overview</h2>
        </div>

        <div className="stats-row">
          <div>
            <span>{totalCount}</span>
            <small>Total</small>
          </div>
          <div>
            <span>{activeCount}</span>
            <small>Open</small>
          </div>
          <div>
            <span>{completedCount}</span>
            <small>Done</small>
          </div>
          <div className="progress-card">
            <span>{completionRate}%</span>
            <small>Complete</small>
            <div className="progress-track" aria-label={`${completionRate}% complete`}>
              <i style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default Home;
