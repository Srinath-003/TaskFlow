import { useState } from "react";

function formatDateInput(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

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

function Task({ task, toggleTask, deleteTask, editTask, updateTaskDetails }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newText, setNewText] = useState(task.text);
  const [newDueDate, setNewDueDate] = useState(formatDateInput(task.dueDate));
  const taskId = task._id;
  const dueDateText = formatDueDate(task.dueDate);

  const cancelEdit = () => {
    setNewText(task.text);
    setNewDueDate(formatDateInput(task.dueDate));
    setIsEditing(false);
  };

  const beginEdit = () => {
    setNewText(task.text);
    setNewDueDate(formatDateInput(task.dueDate));
    setIsEditing(true);
  };

  const handleSave = async () => {
    const text = newText.trim();
    if (!text) return;

    if (updateTaskDetails) {
      await updateTaskDetails(taskId, {
        text,
        dueDate: newDueDate
      });
    } else {
      await editTask(taskId, text);
    }

    setIsEditing(false);
  };

  const handleTaskRowClick = (event) => {
    if (isEditing || event.target.closest("button, input, label")) return;
    toggleTask(taskId);
  };

  return (
    <li
      className={`task-item ${task.completed ? "completed" : ""} ${isEditing ? "editing" : ""}`}
      onClick={handleTaskRowClick}
    >
      <label className="task-check">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => toggleTask(taskId)}
          aria-label={`Mark ${task.text} as ${task.completed ? "active" : "complete"}`}
        />
        <span />
      </label>

      <div className="task-content">
        {isEditing ? (
          <input
            className="edit-input"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") cancelEdit();
            }}
            autoFocus
          />
        ) : (
          <span className="task-title">{task.text}</span>
        )}
      </div>

      {isEditing && (
        <label className="task-due-edit-field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></svg>
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            aria-label="Edit due date"
          />
        </label>
      )}

      {!isEditing && dueDateText && (
        <span className="task-date">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></svg>
          {dueDateText}
        </span>
      )}

      {isEditing ? (
        <button className="icon-button task-edit-button success" onClick={handleSave} aria-label="Save task">
          Save
        </button>
      ) : (
        <button className="icon-button task-edit-button" onClick={beginEdit} aria-label="Edit task">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          Edit
        </button>
      )}

      <button className="icon-button task-delete-button danger" onClick={() => deleteTask(taskId)} aria-label="Delete task">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
        Delete
      </button>
    </li>
  );
}

export default Task;
