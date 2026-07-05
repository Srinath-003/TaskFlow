import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  
  const pad = (num) => num.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatDueDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  return `${dateStr} ${formattedHours.toString().padStart(2, '0')}:${formattedMinutes} ${ampm}`;
}

function formatReminderTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short"
  }).format(date);
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  return `${dateStr} ${formattedHours.toString().padStart(2, '0')}:${formattedMinutes} ${ampm}`;
}

function isOverdue(dueDate, completed) {
  if (!dueDate || completed) return false;
  const d = new Date(dueDate);
  return d < new Date();
}

function Task({ task, toggleTask, deleteTask, editTask, updateTaskDetails, updateTaskReminder, currentUser, readOnly, memberView, isTeamTask }) {
  const userReminder = task.reminders?.find(r => r.userId === currentUser?.id && r.active);
  const hasReminder = !!userReminder;

  const [showReminderPopover, setShowReminderPopover] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(hasReminder);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderRepeat, setReminderRepeat] = useState("once");
  const bellRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // Calculate popover position when it opens
  useEffect(() => {
    if (showReminderPopover && bellRef.current) {
      const updatePosition = () => {
        const rect = bellRef.current.getBoundingClientRect();
        const popoverWidth = 320;
        let popoverHeight = reminderEnabled ? 280 : 150; // Fallback height estimate
        
        if (popoverRef.current) {
          popoverHeight = popoverRef.current.offsetHeight;
        }
        
        let left = rect.right - popoverWidth + 20;
        if (left < 8) left = 8;
        if (left + popoverWidth > window.innerWidth - 8) {
          left = window.innerWidth - popoverWidth - 8;
        }
        
        const spaceBelow = window.innerHeight - rect.bottom;
        let top;
        if (spaceBelow < popoverHeight + 16) {
          // Show ABOVE the bell
          top = rect.top - popoverHeight - 8;
        } else {
          // Show BELOW the bell
          top = rect.bottom + 8;
        }
        
        // Prevent showing off-screen at the top
        if (top < 8) {
          top = 8;
        }
        
        setPopoverPos({ top, left });
      };

      updatePosition();
      // Use animation frame to capture size after initial render/DOM update
      const animId = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(animId);
    }
  }, [showReminderPopover, reminderEnabled]);

  // Re-initialize reminder fields when popover opens or task reminders change
  useEffect(() => {
    if (userReminder) {
      const d = new Date(userReminder.remindAt);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        setReminderDate(`${year}-${month}-${day}`);
        setReminderTime(`${hours}:${minutes}`);
      }
      setReminderRepeat(userReminder.repeat || "once");
      setReminderEnabled(true);
    } else {
      // Default to tomorrow 9:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      setReminderDate(`${year}-${month}-${day}`);
      setReminderTime("09:00");
      setReminderRepeat("once");
      setReminderEnabled(false);
    }
  }, [task.reminders, showReminderPopover, currentUser]);

  const handleAutoSaveReminder = async (enabled, date, time, repeat) => {
    if (!updateTaskReminder) return;

    if (!enabled) {
      await updateTaskReminder(taskId, { active: false });
    } else {
      if (date && time) {
        const remindAt = new Date(`${date}T${time}`);
        if (!isNaN(remindAt.getTime())) {
          await updateTaskReminder(taskId, {
            remindAt: remindAt.toISOString(),
            repeat: repeat,
            active: true
          });
        }
      }
    }
  };
  const [isEditing, setIsEditing] = useState(false);
  const [newText, setNewText] = useState(task.text);
  const [newDueDate, setNewDueDate] = useState(formatDateInput(task.dueDate));
  const taskId = task._id;
  const dueDateText = formatDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.completed);

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
      await updateTaskDetails(taskId, { text, dueDate: newDueDate });
    } else if (editTask) {
      await editTask(taskId, text);
    }

    setIsEditing(false);
  };

  const handleTaskRowClick = (event) => {
    if (isEditing || showReminderPopover || event.target.closest("button, input, label")) return;
    toggleTask(taskId);
  };

  return (
    <li
      className={`task-item ${task.completed ? "completed" : ""} ${isEditing ? "editing" : ""} ${overdue ? "overdue" : ""}`}
      onClick={handleTaskRowClick}
    >
      {/* Checkbox */}
      <label className="task-check" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => toggleTask(taskId)}
          aria-label={`Mark ${task.text} as ${task.completed ? "active" : "complete"}`}
        />
        <span className="checkmark" />
      </label>

      {/* Task text content */}
      <div className="task-content">
        {isEditing ? (
          <input
            className="edit-input"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") cancelEdit();
            }}
            autoFocus
          />
        ) : (
          <span className="task-title">{task.text}</span>
        )}

      </div>

      {/* Right controls - flex layout with fixed slot widths */}
      <div className="task-right-controls">
        {/* Slot 1: Completed Badge */}
        <div className="control-slot badge-slot">
          {!isEditing && isTeamTask && task.completed && task.completedByName && (
            <span className="completed-by-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {task.completedByName}
            </span>
          )}
        </div>

        {/* Slot 2: Due Date */}
        <div className="control-slot date-slot">
          {isEditing ? (
            <label className="task-due-edit-field">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 2v4M16 2v4"/>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M3 10h18"/>
              </svg>
              <input
                type="datetime-local"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                onClick={e => { try { e.target.showPicker(); } catch (_) {} }}
                aria-label="Edit due date and time"
              />
            </label>
          ) : dueDateText ? (
            <span className={`task-date ${overdue ? "overdue-date" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 2v4M16 2v4"/>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M3 10h18"/>
              </svg>
              {dueDateText}
            </span>
          ) : null}
        </div>

        {/* Slot 2.5: Reminder Bell */}
        <div className="control-slot reminder-slot">
          {!isEditing && (
            <button
              ref={bellRef}
              className={`reminder-btn ${hasReminder ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowReminderPopover(!showReminderPopover);
              }}
              title={hasReminder ? "Reminder set" : "Set reminder"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          )}

          {showReminderPopover && createPortal(
            <>
              <div className="reminder-backdrop" onClick={() => setShowReminderPopover(false)} />
              <div
                ref={popoverRef}
                className="reminder-popover"
                style={{ top: popoverPos.top, left: popoverPos.left }}
                onClick={e => e.stopPropagation()}
              >
                <div className="reminder-popover-header">
                  <h3>Set Reminder</h3>
                  <button className="close-popover-btn" onClick={() => setShowReminderPopover(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="reminder-popover-body">
                  <div className="reminder-toggle-row">
                    <div className="reminder-toggle-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="bell-icon-small">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      <div>
                        <span className="toggle-title">Reminder</span>
                        <span className="toggle-desc">Get notified at a specific time</span>
                      </div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={reminderEnabled}
                        onChange={e => {
                          const val = e.target.checked;
                          setReminderEnabled(val);
                          handleAutoSaveReminder(val, reminderDate, reminderTime, reminderRepeat);
                        }}
                      />
                      <span className="slider round" />
                    </label>
                  </div>

                  {reminderEnabled && (
                    <>
                      <div className="reminder-field">
                        <label>Remind me at</label>
                        <div className="reminder-datetime-inputs">
                          <input
                            type="date"
                            value={reminderDate}
                            onChange={e => {
                              const val = e.target.value;
                              setReminderDate(val);
                              handleAutoSaveReminder(reminderEnabled, val, reminderTime, reminderRepeat);
                            }}
                            className="reminder-date-input"
                          />
                          <input
                            type="time"
                            value={reminderTime}
                            onChange={e => {
                              const val = e.target.value;
                              setReminderTime(val);
                              handleAutoSaveReminder(reminderEnabled, reminderDate, val, reminderRepeat);
                            }}
                            className="reminder-time-input"
                          />
                        </div>
                      </div>
                      <div className="reminder-field">
                        <label>Repeat</label>
                        <select
                          value={reminderRepeat}
                          onChange={e => {
                            const val = e.target.value;
                            setReminderRepeat(val);
                            handleAutoSaveReminder(reminderEnabled, reminderDate, reminderTime, val);
                          }}
                          className="reminder-select"
                        >
                          <option value="once">Once</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>,
            document.body
          )}
        </div>

        {/* Slot 3: Actions */}
        <div className="control-slot action-slot">
          <div className="task-actions">
            {isEditing ? (
              <>
                <button className="icon-button task-save-btn" onClick={handleSave}>Save</button>
                <button className="icon-button task-cancel-btn" onClick={cancelEdit}>Cancel</button>
              </>
            ) : (
              <>
                {!readOnly && editTask && (
                  <button className="icon-button task-edit-button" onClick={beginEdit} aria-label="Edit task">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  </button>
                )}
                {!readOnly && deleteTask && (
                  <button className="icon-button task-delete-button" onClick={() => deleteTask(taskId)} aria-label="Delete task">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export default Task;
