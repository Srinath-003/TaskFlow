import { useState } from "react";
import Task from "../components/Task";

function formatDueDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function Home({
  task,
  setTask,
  dueDate,
  setDueDate,
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
  updateTaskDetails,
  clearTopic,
  status,
  error
}) {
  const totalCount = tasks.length;
  const completedCount = tasks.filter((item) => item.completed).length;
  const pendingCount = totalCount - completedCount;
  const [topicSearch, setTopicSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [isEditingSelectedTopic, setIsEditingSelectedTopic] = useState(false);
  const [selectedTopicDraft, setSelectedTopicDraft] = useState("");
  const selectedDueDateText = formatDueDate(dueDate);

  const filteredTasks = tasks.filter((item) =>
    item.text?.toLowerCase().includes(taskSearch.toLowerCase())
  );

  const filteredTopics = topics.filter((t) =>
    t.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const getTopicStats = (topicName) => {
    const topicTasks = allTasks.filter((item) => (item.topic || "General") === topicName);
    const pendingTasks = topicTasks.filter((item) => !item.completed).length;

    return {
      total: topicTasks.length,
      pending: pendingTasks
    };
  };

  const selectTopic = (topicName) => {
    setSelectedTopic(topicName);
    setTopic(topicName);
    setTaskSearch("");
  };

  const handleBack = () => {
    setSelectedTopic("");
    setTopic("");
    setTaskSearch("");
  };

  const beginTopicEdit = () => {
    setSelectedTopicDraft(selectedTopic);
    setIsEditingSelectedTopic(true);
  };

  const cancelTopicEdit = () => {
    setSelectedTopicDraft("");
    setIsEditingSelectedTopic(false);
  };

  const saveTopicEdit = async () => {
    await editTopic(selectedTopic, selectedTopicDraft);
    cancelTopicEdit();
  };

  const topicSelected = Boolean(selectedTopic);

  return (
    <div className="dashboard-wrapper">
      {!topicSelected && (
        <div className="topics-view">
          <div className="panel topics-panel">
            <div className="panel-header">
              <p className="eyebrow">Topics</p>
            </div>

            <div className="topic-search-wrap">
              <span className="search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
              </span>
              <input
                type="text"
                placeholder="Search topics"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                aria-label="Search topics"
              />
            </div>

            <div className="add-topic-form">
              <label className="topic-input-field">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                <input
                  type="text"
                  placeholder="New topic"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTopic()}
                  aria-label="New topic"
                />
              </label>
              <button className="btn-accent" onClick={addTopic}>Add</button>
            </div>

            <div className="topic-list">
              {filteredTopics.map((topicName, index) => {
                const topicStats = getTopicStats(topicName);

                return (
                  <div key={topicName} className="topic-row">
                    <button
                      className="topic-button"
                      onClick={() => selectTopic(topicName)}
                    >
                      <span className="topic-order">{index + 1}</span>
                      <span className="topic-name-text">{topicName}</span>
                      <span className="topic-stats">
                        <span>
                          <svg className="summary-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5M10 12h5M10 16h5" /></svg>
                          {topicStats.total} Tasks
                        </span>
                        <span>
                          <svg className="summary-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                          {topicStats.total - topicStats.pending} Completed
                        </span>
                        <span>
                          <svg className="summary-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                          {topicStats.pending} Pending
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}

              {topics.length === 0 && (
                <p className="empty-state">No topics yet. Add one below.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {topicSelected && (
        <div className="task-view">
          <div className="task-progress-grid">
            <section className="task-column task-workspace-panel">
              <div className="topic-title-box">
                {isEditingSelectedTopic ? (
                  <div className="topic-title-edit">
                    <input
                      className="topic-title-input"
                      type="text"
                      value={selectedTopicDraft}
                      onChange={(e) => setSelectedTopicDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTopicEdit();
                        if (e.key === "Escape") cancelTopicEdit();
                      }}
                      aria-label="Edit topic name"
                      autoFocus
                    />
                    <button className="topic-action topic-save-button success" onClick={saveTopicEdit}>Save</button>
                    <button className="topic-action topic-cancel-button" onClick={cancelTopicEdit}>Cancel</button>
                  </div>
                ) : (
                  <div className="topic-title-content">
                    <button className="topic-back-button" onClick={handleBack} aria-label="Back to topics">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
                    </button>
                    <h2 className="task-view-title">{selectedTopic}</h2>
                    <div className="topic-header-actions">
                      <button className="topic-action-edit" onClick={beginTopicEdit}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                        Edit
                      </button>
                      <button className="delete-all-button" onClick={clearTopic} disabled={totalCount === 0}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                        Delete all tasks
                      </button>
                    </div>
                  </div>
                )}

                <div className="task-summary" aria-label="Task summary">
                  <span className="summary-total">
                    <svg className="summary-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5M10 12h5M10 16h5" /></svg>
                    {totalCount} Tasks
                  </span>
                  <span className="summary-completed">
                    <svg className="summary-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                    {completedCount} Completed
                  </span>
                  <span className="summary-pending">
                    <svg className="summary-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                    {pendingCount} Pending
                  </span>
                </div>
              </div>

              <div className="task-search-wrap">
                <span className="search-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
                </span>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  aria-label="Search tasks"
                />
              </div>

              {error && <p className="error-message">{error}</p>}

              <div className="quick-add">
                <label className="task-input-field">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                  <input
                    type="text"
                    placeholder={`Add a task to ${selectedTopic}...`}
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    aria-label="Task text"
                  />
                </label>
                <label className="date-field">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></svg>
                  <span>{selectedDueDateText || "Due date"}</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    aria-label="Due date"
                  />
                </label>
                <button className="btn-accent" onClick={addTask}>Add task</button>
              </div>

              <div className="task-area">
                {status === "loading" ? (
                  <p className="empty-state">Loading tasks...</p>
                ) : totalCount === 0 ? (
                  <p className="empty-state">No tasks yet. Add one above.</p>
                ) : filteredTasks.length === 0 ? (
                  <p className="empty-state">No tasks match your search.</p>
                ) : (
                  <ul className="task-list">
                    {filteredTasks.map((item) => (
                      <Task
                        key={item._id}
                        task={item}
                        toggleTask={toggleTask}
                        deleteTask={deleteTask}
                        editTask={editTask}
                        updateTaskDetails={updateTaskDetails}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
