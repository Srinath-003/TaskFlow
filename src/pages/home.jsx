import { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import Task from "../components/Task";
import MembersModal from "../components/MembersModal";

const AUTH_BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "https://task-manager-6wdd.onrender.com");
const AUTH_URL = `${AUTH_BASE}/api/auth`;

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

function normalizeTopic(topic) {
  return topic && topic.trim() ? topic.trim() : "General";
}

const getTopicColor = (name) => {
  if (name === "General") return "#3b82f6"; // Blue
  if (name === "College Project") return "#8b5cf6"; // Purple
  if (name === "Placement Prep") return "#f59e0b"; // Orange/Yellow
  if (name === "Web Development") return "#10b981"; // Green
  if (name === "Learning") return "#06b6d4"; // Cyan
  if (name === "Personal") return "#ec4899"; // Pink

  // Hash function for custom topics
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 70%, 55%)`;
};

const getRelativeTimeString = (dateInput) => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Recently";
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
};

const getTopicLastUpdatedText = (topicName, topicTasks) => {
  const times = topicTasks.map(t => t.updatedAt).filter(Boolean);
  if (times.length > 0) {
    const latest = new Date(Math.max(...times.map(d => new Date(d))));
    return getRelativeTimeString(latest);
  }
  // Consistent mockups based on name
  if (topicName === "College Project") return "2 hours ago";
  if (topicName === "Placement Prep") return "1 day ago";
  if (topicName === "Personal") return "2 days ago";
  if (topicName === "Web Development") return "1 day ago";
  if (topicName === "Learning") return "2 days ago";
  return "Recently";
};

const getTopicLastUpdatedTime = (topicName, topicTasks) => {
  const times = topicTasks.map(t => t.updatedAt).filter(Boolean);
  if (times.length > 0) {
    return Math.max(...times.map(d => new Date(d).getTime()));
  }
  // Consistent mockups based on name to match getTopicLastUpdatedText
  if (topicName === "College Project") return Date.now() - 2 * 60 * 60 * 1000;
  if (topicName === "Placement Prep") return Date.now() - 24 * 60 * 60 * 1000;
  if (topicName === "Personal") return Date.now() - 2 * 24 * 60 * 60 * 1000;
  if (topicName === "Web Development") return Date.now() - 24 * 60 * 60 * 1000;
  if (topicName === "Learning") return Date.now() - 2 * 24 * 60 * 60 * 1000;
  return 0;
};

const formatTaskTime = (dueDate) => {
  if (!dueDate) return "";
  const date = new Date(dueDate);
  if (isNaN(date.getTime())) return "";

  const hours = date.getHours();
  const minutes = date.getMinutes();

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');

  if (hours === 0 && minutes === 0) {
    return "06:00 PM";
  }
  return `${formattedHours.toString().padStart(2, '0')}:${formattedMinutes} ${ampm}`;
};

const sortByDueDate = (a, b) => {
  if (a.completed !== b.completed) {
    return a.completed ? 1 : -1;
  }
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
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }
  }
  return 0;
};

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
  updateTaskReminder,
  deleteTopic,
  status,
  error,
  currentUser,
  collaborations,
  selectedCollab,
  shareTopicAsCollab,
  inviteMember,
  removeMember,
  invitations = [],
  acceptInvitation,
  declineInvitation
}) {
  const [taskSearch, setTaskSearch] = useState("");
  const [newTopicInput, setNewTopicInput] = useState("");
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState("");
  const [sidebarView, setSidebarView] = useState("mytasks");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shareError, setShareError] = useState("");

  // Sidebar profile accordion
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Profile settings form
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrPass, setShowCurrPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");
  const [currPassVerified, setCurrPassVerified] = useState(false);
  const [currPassVerifying, setCurrPassVerifying] = useState(false);
  const [currPassErr, setCurrPassErr] = useState("");

  const [darkTheme, setDarkTheme] = useState(() => {
    return localStorage.getItem("darkTheme") === "true";
  });

  useEffect(() => {
    if (darkTheme) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
    localStorage.setItem("darkTheme", darkTheme);
  }, [darkTheme]);

  // Dashboard states
  const [isAddingTopicSidebar, setIsAddingTopicSidebar] = useState(false);
  const [isAddingTaskToday, setIsAddingTaskToday] = useState(false);
  const [todayTaskInput, setTodayTaskInput] = useState("");
  const [todayTaskTopic, setTodayTaskTopic] = useState("General");
  const [isAddingTopicRecent, setIsAddingTopicRecent] = useState(false);
  const [recentTopicInput, setRecentTopicInput] = useState("");

  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem(`activities_${currentUser?.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: "act-1",
        type: "completed",
        text: 'Completed "Design landing page" in College Project',
        time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "act-2",
        type: "added",
        text: 'Added new task "Prepare for HR Round" in Placement Prep',
        time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "act-3",
        type: "updated",
        text: 'Updated "React Authentication" in Web Development',
        time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  });

  const logActivity = (type, text) => {
    const newAct = {
      id: `act-${Date.now()}-${Math.random()}`,
      type,
      text,
      time: new Date().toISOString()
    };
    setActivities(prev => {
      const updated = [newAct, ...prev].slice(0, 10);
      localStorage.setItem(`activities_${currentUser?.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveProfile = async () => {
    setProfileMsg(""); setProfileErr("");
    try {
      const res = await axios.put(`${AUTH_URL}/profile/${currentUser.id}`, { name: profileName });
      const updatedUser = res.data.user;
      const stored = JSON.parse(sessionStorage.getItem("user") || "{}");
      sessionStorage.setItem("user", JSON.stringify({ ...stored, name: updatedUser.name }));
      setProfileMsg("Profile updated successfully!");
    } catch (err) {
      setProfileErr(err.response?.data?.message || "Could not update profile.");
    }
  };

  const handleVerifyPassword = async () => {
    setCurrPassErr("");
    if (!currentPassword) { setCurrPassErr("Enter your current password."); return; }
    setCurrPassVerifying(true);
    try {
      await axios.post(`${AUTH_URL}/profile/${currentUser.id}/verify-password`, { currentPassword });
      setCurrPassVerified(true);
      setCurrPassErr("");
    } catch (err) {
      setCurrPassVerified(false);
      setCurrPassErr(err.response?.data?.message || "Incorrect password.");
    } finally {
      setCurrPassVerifying(false);
    }
  };

  const handleChangePassword = async () => {
    setPassMsg(""); setPassErr("");
    if (newPassword !== confirmPassword) {
      setPassErr("New passwords do not match."); return;
    }
    try {
      await axios.put(`${AUTH_URL}/profile/${currentUser.id}/password`, { currentPassword, newPassword });
      setPassMsg("Password updated successfully!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setCurrPassVerified(false); setCurrPassErr("");
    } catch (err) {
      setPassErr(err.response?.data?.message || "Could not update password.");
    }
  };

  const selectedDueDateText = formatDueDate(dueDate);

  const filteredTasks = useMemo(() =>
    tasks.filter((item) =>
      item.text?.toLowerCase().includes(taskSearch.toLowerCase())
    ), [tasks, taskSearch]);

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => {
      const collabA = collaborations.find(c => c.topicName === a);
      const memberIdsA = collabA?.members.map(m => m.userId) || [];
      const topicTasksA = allTasks.filter(item => {
        const t = (item.topic || "General");
        if (t !== a) return false;
        if (memberIdsA.length > 0) return memberIdsA.includes(item.userId);
        return true;
      });

      const collabB = collaborations.find(c => c.topicName === b);
      const memberIdsB = collabB?.members.map(m => m.userId) || [];
      const topicTasksB = allTasks.filter(item => {
        const t = (item.topic || "General");
        if (t !== b) return false;
        if (memberIdsB.length > 0) return memberIdsB.includes(item.userId);
        return true;
      });

      return getTopicLastUpdatedTime(b, topicTasksB) - getTopicLastUpdatedTime(a, topicTasksA);
    });
  }, [topics, allTasks, collaborations]);

  const getTopicStats = (topicName) => {
    const memberIds = collaborations
      .find(c => c.topicName === topicName)
      ?.members.map(m => m.userId) || [];

    const topicTasks = allTasks.filter(item => {
      const t = (item.topic || "General");
      if (t !== topicName) return false;
      if (memberIds.length > 0) return memberIds.includes(item.userId);
      return true;
    });

    return {
      total: topicTasks.length,
      pending: topicTasks.filter(i => !i.completed).length,
      completed: topicTasks.filter(i => i.completed).length,
    };
  };

  const getCollabForTopic = (topicName) =>
    collaborations.find(c => c.topicName === topicName) || null;

  const selectTopic = (topicName) => {
    setSelectedTopic(topicName);
    setTopic(topicName);
    setTaskSearch("");
    setSidebarView("topics");
  };

  const handleBack = () => {
    setSelectedTopic("");
    setTopic("");
    setTaskSearch("");
    setSidebarView("mytasks");
  };

  const handleAddTopic = (customName) => {
    const name = (typeof customName === "string" ? customName : (newTopicInput || newTopic)).trim();
    if (!name) return;
    addTopic(name);
    setSidebarView("topics");
    logActivity("added", `Created topic "${name}"`);
    setNewTopicInput("");
  };

  const beginTopicEdit = () => {
    setTopicDraft(selectedTopic);
    setIsEditingTopic(true);
  };

  const cancelTopicEdit = () => {
    setTopicDraft("");
    setIsEditingTopic(false);
  };

  const saveTopicEdit = async () => {
    await editTopic(selectedTopic, topicDraft);
    logActivity("updated", `Renamed topic "${selectedTopic}" to "${topicDraft}"`);
    cancelTopicEdit();
  };

  const handleAddTask = async () => {
    const text = task.trim();
    if (!text) return;
    await addTask();
    logActivity("added", `Added new task "${text}" in ${selectedTopic || "General"}`);
  };

  const handleToggleTask = async (id) => {
    const t = allTasks.find(item => item._id === id);
    if (t) {
      await toggleTask(id);
      logActivity(
        !t.completed ? "completed" : "updated",
        `${!t.completed ? "Completed" : "Reopened"} "${t.text}" in ${t.topic || "General"}`
      );
    }
  };

  const handleDeleteTask = async (id) => {
    const t = allTasks.find(item => item._id === id);
    if (t) {
      await deleteTask(id);
      logActivity("updated", `Deleted task "${t.text}" from ${t.topic || "General"}`);
    }
  };

  const handleEditTask = async (id, newText) => {
    const t = allTasks.find(item => item._id === id);
    if (t) {
      await editTask(id, newText);
      logActivity("updated", `Updated "${t.text}" in ${t.topic || "General"}`);
    }
  };

  const handleUpdateTaskDetails = async (id, changes) => {
    const t = allTasks.find(item => item._id === id);
    if (t) {
      await updateTaskDetails(id, changes);
      let changeMsg = `Updated "${t.text}" in ${t.topic || "General"}`;
      if (changes.text && changes.text !== t.text) {
        changeMsg = `Renamed task "${t.text}" to "${changes.text}" in ${t.topic || "General"}`;
      } else if (changes.dueDate !== undefined) {
        changeMsg = `Changed due date of "${t.text}" in ${t.topic || "General"}`;
      }
      logActivity("updated", changeMsg);
    }
  };

  const submitTodayTask = async () => {
    const text = todayTaskInput.trim();
    if (!text) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    await addTask(text, todayTaskTopic, todayStr);
    logActivity("added", `Added new task "${text}" in ${todayTaskTopic}`);
    setTodayTaskInput("");
    setIsAddingTaskToday(false);
  };

  const submitRecentTopic = () => {
    const name = recentTopicInput.trim();
    if (!name) return;
    handleAddTopic(name);
    setRecentTopicInput("");
    setIsAddingTopicRecent(false);
  };

  const handleDeleteTopic = async () => {
    if (window.confirm(`Are you sure you want to delete the topic "${selectedTopic}"? This will delete all tasks inside it.`)) {
      await deleteTopic();
      logActivity("deleted", `Deleted topic "${selectedTopic}"`);
    }
  };

  const handleShareTopic = async () => {
    setShareError("");
    try {
      await shareTopicAsCollab(selectedTopic);
    } catch (err) {
      setShareError(err.response?.data?.message || "Could not share topic.");
    }
  };

  const handleLeaveTopic = async () => {
    if (!selectedCollab || !currentUser) return;
    if (!window.confirm(`Leave "${selectedTopic}"? You will no longer have access to this topic.`)) return;
    try {
      await removeMember(selectedCollab._id, currentUser.id);
      setSelectedTopic("");
      setTopic("");
      setSidebarView("mytasks");
      logActivity("updated", `Left the topic "${selectedTopic}"`);
    } catch (err) {
      setShareError(err.response?.data?.message || "Could not leave topic.");
    }
  };

  // A topic is only a real "team" topic when there are 2+ members (owner + at least one other)
  const isActiveTeam   = !!(selectedCollab && selectedCollab.members.length > 1);
  // Determine if current user is owner of selected collab
  const isCollabOwner  = selectedCollab && selectedCollab.ownerId === currentUser?.id;
  const isMemberOnly   = isActiveTeam && !isCollabOwner &&
    selectedCollab.members.some(m => m.userId === currentUser?.id);

  const totalCount = tasks.length;
  const completedCount = tasks.filter(i => i.completed).length;
  const pendingCount = totalCount - completedCount;

  const topicUpcomingTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) > now);
  }, [tasks]);

  const nextUpcomingTaskDateText = useMemo(() => {
    if (topicUpcomingTasks.length === 0) return null;
    const sorted = [...topicUpcomingTasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const d = new Date(sorted[0].dueDate);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(d);
  }, [topicUpcomingTasks]);

  // Dashboard views
  const todayTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allTasks.filter(item => {
      if (item.completed) return false; // hide finished tasks
      if (!item.dueDate) return false;
      const d = new Date(item.dueDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).sort(sortByDueDate);
  }, [allTasks]);

  const importantTasks = useMemo(() => {
    const now = new Date();
    return allTasks.filter(item => {
      if (!item.dueDate || item.completed) return false;
      const d = new Date(item.dueDate);
      return d <= now;
    }).sort(sortByDueDate);
  }, [allTasks]);

  const reminderTasks = useMemo(() => {
    return allTasks.filter(item => 
      item.reminders && item.reminders.some(r => r.userId === currentUser?.id && r.active)
    ).sort(sortByDueDate);
  }, [allTasks, currentUser]);

  const myTasks = useMemo(() =>
    allTasks.filter(item => !item.completed), [allTasks]);

  const getUserInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  // Render dashboard view tasks
  const getDashboardTasks = () => {
    switch (sidebarView) {
      case "today": return todayTasks;
      case "important": return importantTasks;
      case "reminders": return reminderTasks;
      case "mytasks": return myTasks;
      default: return [];
    }
  };

  const dashboardTasks = getDashboardTasks();
  const isDashboardView = sidebarView !== "topics" || !selectedTopic;

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  const toggleProfileMenu = (e) => {
    e.stopPropagation();
    setProfileMenuOpen(!profileMenuOpen);
  };

  return (
    <div className="app-shell-new">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            {sidebarOpen && <span className="brand-name">TaskFlow</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen
                ? <path d="M15 18l-6-6 6-6" />
                : <path d="M9 18l6-6-6-6" />
              }
            </svg>
          </button>
        </div>

        {/* Nav section */}
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${sidebarView === "mytasks" && !selectedTopic ? "active" : ""}`}
            onClick={() => { setSidebarView("mytasks"); setSelectedTopic(""); }}
            title="My Tasks"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            {sidebarOpen && <span>My Tasks</span>}
          </button>

          <button
            className={`nav-item ${sidebarView === "invitations" ? "active" : ""}`}
            onClick={() => { setSidebarView("invitations"); setSelectedTopic(""); }}
            title="Invitations"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {sidebarOpen && <span>Invitations</span>}
            {sidebarOpen && invitations.length > 0 && (
              <span className="nav-badge">{invitations.length}</span>
            )}
          </button>

          <button
            className={`nav-item ${sidebarView === "important" ? "active" : ""}`}
            onClick={() => { setSidebarView("important"); setSelectedTopic(""); }}
            title="Overdue"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
            {sidebarOpen && <span>Overdue</span>}
            {sidebarOpen && importantTasks.length > 0 && (
              <span className="nav-badge danger">{importantTasks.length}</span>
            )}
          </button>

          <button
            className={`nav-item ${sidebarView === "reminders" ? "active" : ""}`}
            onClick={() => { setSidebarView("reminders"); setSelectedTopic(""); }}
            title="Reminders"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {sidebarOpen && <span>Reminders</span>}
          </button>
        </nav>

        {/* Topics section */}
        {sidebarOpen && (
          <div className="sidebar-topics">
            <div className="sidebar-section-label">
              <span>TOPICS</span>
            </div>

            <div className="topics-scroll">
              {topics.map((topicName) => {
                const collab = getCollabForTopic(topicName);
                const stats = getTopicStats(topicName);
                const isActive = selectedTopic === topicName && sidebarView === "topics";

                return (
                  <button
                    key={topicName}
                    className={`sidebar-topic-item ${isActive ? "active" : ""}`}
                    onClick={() => selectTopic(topicName)}
                  >
                    <svg className="topic-folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="sidebar-topic-name">{topicName}</span>
                    <div className="topic-item-right">
                      {collab && collab.members.length > 1 && (
                        <span className="collab-badge" title={`${collab.members.length} members`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          {collab.members.length}
                        </span>
                      )}
                      {stats.total > 0 && (
                        <span className="topic-pending-count">{stats.total}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* User info accordion */}
        <div className="sidebar-user-container">
          <div
            className={`sidebar-user ${profileMenuOpen ? "expanded" : ""}`}
            onClick={() => setProfileMenuOpen(o => !o)}
          >
            <div className="user-avatar">{getUserInitials(currentUser?.name)}</div>
            {sidebarOpen && (
              <div className="user-details">
                <span className="user-name">{currentUser?.name}</span>
                <span className="user-email">{currentUser?.email}</span>
              </div>
            )}
            {sidebarOpen && (
              <div className={`profile-chevron ${profileMenuOpen ? "up" : ""}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </div>
            )}
          </div>
          {profileMenuOpen && sidebarOpen && (
            <div className="sidebar-profile-accordion">
              <button
                className={`sidebar-profile-item ${sidebarView === "profile" ? "active" : ""}`}
                onClick={() => { setSidebarView("profile"); setSelectedTopic(""); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </button>
              <button className="sidebar-profile-item logout-item" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">

        {/* Profile Settings view */}
        {sidebarView === "profile" && (
          <div className="profile-settings-page" style={{ position: "relative" }}>
            
            {/* Floating Theme Toggle (only in settings page) */}
            <button
              className="floating-theme-toggle"
              onClick={() => setDarkTheme(prev => !prev)}
              title={darkTheme ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle dark mode"
              style={{ position: "absolute", top: "16px", right: "20px" }}
            >
              {darkTheme ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Profile Information Card */}
            <div className="profile-card">
              <div className="profile-card-title">
                <div className="profile-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <h3>Profile Information</h3>
                  <p>Update your personal information</p>
                </div>
              </div>
              <div className="profile-card-body">
                <div className="profile-avatar-row">
                  <div className="profile-avatar-large">{getUserInitials(currentUser?.name)}</div>
                </div>
                <div className="profile-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Your full name"
                    className="profile-input"
                  />
                </div>
                <div className="profile-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={currentUser?.email || ""}
                    readOnly
                    className="profile-input readonly"
                  />
                </div>
                {profileMsg && <p className="profile-success-msg">{profileMsg}</p>}
                {profileErr && <p className="profile-error-msg">{profileErr}</p>}
                <div className="profile-card-footer">
                  <button className="profile-save-btn" onClick={handleSaveProfile}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="profile-card">
              <div className="profile-card-title">
                <div className="profile-card-icon secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div>
                  <h3>Change Password</h3>
                  <p>Update your password to keep your account secure</p>
                </div>
              </div>
              <div className="profile-card-body">
                {/* Current Password row with Verify button */}
                <div className="profile-field">
                  <label>Current Password</label>
                  <div className="profile-input-wrapper">
                    <input
                      type={showCurrPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => {
                        setCurrentPassword(e.target.value);
                        setCurrPassVerified(false);
                        setCurrPassErr("");
                        setPassMsg(""); setPassErr("");
                      }}
                      placeholder="Enter current password"
                      className={`profile-input ${currPassVerified ? "verified" : ""}`}
                    />
                    <button className="pass-toggle-btn" onClick={() => setShowCurrPass(v => !v)} type="button">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {showCurrPass
                          ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                          : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                      </svg>
                    </button>
                  </div>
                  {currPassErr && <p className="profile-error-msg">{currPassErr}</p>}
                  {!currPassVerified ? (
                    <button
                      className="verify-pass-btn"
                      onClick={handleVerifyPassword}
                      disabled={!currentPassword || currPassVerifying}
                    >
                      {currPassVerifying ? "Verifying…" : "Verify Password"}
                    </button>
                  ) : (
                    <p className="profile-success-msg">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:14,height:14,display:"inline",marginRight:4}}><polyline points="20 6 9 17 4 12"/></svg>
                      Current password verified. You can now set a new password.
                    </p>
                  )}
                </div>

                {/* New password fields — only shown after verification */}
                {currPassVerified && (
                  <>
                    {[{label:"New Password", val:newPassword, set:setNewPassword, show:showNewPass, toggle:()=>setShowNewPass(v=>!v), ph:"Enter new password"},
                      {label:"Confirm New Password", val:confirmPassword, set:setConfirmPassword, show:showConfPass, toggle:()=>setShowConfPass(v=>!v), ph:"Confirm new password"}
                    ].map(({label, val, set, show, toggle, ph}) => (
                      <div className="profile-field" key={label}>
                        <label>{label}</label>
                        <div className="profile-input-wrapper">
                          <input
                            type={show ? "text" : "password"}
                            value={val}
                            onChange={e => set(e.target.value)}
                            placeholder={ph}
                            className="profile-input"
                          />
                          <button className="pass-toggle-btn" onClick={toggle} type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {show
                                ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                                : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {passMsg && <p className="profile-success-msg">{passMsg}</p>}
                    {passErr && <p className="profile-error-msg">{passErr}</p>}
                    <div className="profile-card-footer">
                      <button className="profile-save-btn" onClick={handleChangePassword}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Update Password
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Theme Preferences Card */}
            <div className="profile-card">
              <div className="profile-card-title">
                <div className="profile-card-icon secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                </div>
                <div>
                  <h3>Theme Settings</h3>
                  <p>Choose your application appearance preference</p>
                </div>
              </div>
              <div className="profile-card-body">
                <div className="profile-field">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Dark Mode</span>
                      <span style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        Switch to a dark color palette for late night work
                      </span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={darkTheme}
                        onChange={e => setDarkTheme(e.target.checked)}
                      />
                      <span className="slider round" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Card */}
            <div className="profile-card logout-card">
              <div className="profile-card-title">
                <div className="profile-card-icon danger">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
                <div>
                  <h3>Logout</h3>
                  <p>Sign out from your account</p>
                </div>
              </div>
              <button className="profile-logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        )}

        {/* Main Dashboard view */}
        {(sidebarView === "mytasks" || (sidebarView === "topics" && !selectedTopic)) && (
          <div className="dashboard-panel">
            {/* Welcome banner */}
            <div className="dashboard-welcome-card">
              <div className="welcome-text-side">
                <h2>Welcome back, {currentUser?.name || "Srinath"}! 👋</h2>
                <p>Stay organized and get things done.</p>
              </div>
              <div className="welcome-illustration-side">
                <svg viewBox="0 0 200 180" fill="none" className="welcome-clipboard-svg">
                  <rect x="50" y="30" width="100" height="130" rx="12" fill="#2563eb" fillOpacity="0.1" stroke="#2563eb" strokeWidth="3" />
                  <rect x="65" y="45" width="70" height="100" rx="6" fill="#ffffff" />
                  <rect x="85" y="18" width="30" height="20" rx="4" fill="#1d4ed8" />
                  <circle cx="100" cy="28" r="3" fill="#ffffff" />
                  <rect x="75" y="60" width="12" height="12" rx="3" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
                  <path d="M78 66l2 2 4-4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="95" y1="66" x2="125" y2="66" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round" />
                  <rect x="75" y="85" width="12" height="12" rx="3" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
                  <path d="M78 91l2 2 4-4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="95" y1="91" x2="120" y2="91" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round" />
                  <rect x="75" y="110" width="12" height="12" rx="3" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
                  <path d="M78 116l2 2 4-4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="95" y1="116" x2="115" y2="116" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M30 110c10-20 30-10 30 10s-20 30-30 10z" fill="#93c5fd" fillOpacity="0.4" />
                  <path d="M170 80c-5-20-25-20-25 0s15 30 25 10z" fill="#93c5fd" fillOpacity="0.4" />
                </svg>
              </div>
            </div>

            {/* Stats grid */}
            <div className="dashboard-stats-grid">
              <div className="dashboard-stat-card topics">
                <div className="stat-icon-wrapper purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Topics</span>
                  <span className="stat-value">{topics.length}</span>
                </div>
              </div>

              <div className="dashboard-stat-card tasks">
                <div className="stat-icon-wrapper green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="9" x2="15" y2="9" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="15" y2="17" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Tasks</span>
                  <span className="stat-value">{allTasks.length}</span>
                </div>
              </div>

              <div className="dashboard-stat-card completed">
                <div className="stat-icon-wrapper teal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Completed</span>
                  <span className="stat-value">{allTasks.filter(t => t.completed).length}</span>
                </div>
              </div>

              <div className="dashboard-stat-card pending">
                <div className="stat-icon-wrapper orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Pending</span>
                  <span className="stat-value">{allTasks.filter(t => !t.completed).length}</span>
                </div>
              </div>
            </div>

            {/* Two column middle layout */}
            <div className="dashboard-middle-row">
              {/* Recent Topics Card */}
              <div className="dashboard-card recent-topics-card">
                <div className="card-header">
                  <h3>
                    <svg className="card-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    Recent Topics
                  </h3>
                  <button className="card-header-link" onClick={() => { setSidebarOpen(true); setSidebarView("topics"); }}>View all</button>
                </div>

                <div className="card-content">
                  <ul className="dashboard-topics-list-simple">
                    {sortedTopics.map((topicName) => {
                      const stats = getTopicStats(topicName);
                      const folderColor = getTopicColor(topicName);
                      const topicTasks = allTasks.filter(t => normalizeTopic(t.topic) === topicName);
                      const lastUpdated = getTopicLastUpdatedText(topicName, topicTasks);

                      return (
                        <li key={topicName} className="dashboard-topic-item-simple" onClick={() => selectTopic(topicName)}>
                          <div className="topic-icon-folder" style={{ backgroundColor: folderColor + "1a", color: folderColor }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                          </div>
                          <div className="topic-info-main">
                            <span className="topic-name-simple">{topicName}</span>
                            <span className="topic-task-count">{stats.total} tasks</span>
                          </div>
                          <div className="topic-time-right">
                            Updated {lastUpdated}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {isAddingTopicRecent ? (
                    <div className="dashboard-inline-add-topic">
                      <input
                        type="text"
                        placeholder="Topic name…"
                        value={recentTopicInput}
                        onChange={e => setRecentTopicInput(e.target.value)}
                        className="inline-topic-input"
                        onKeyDown={e => e.key === "Enter" && submitRecentTopic()}
                        autoFocus
                      />
                      <div className="inline-add-actions">
                        <button className="inline-btn save" onClick={submitRecentTopic}>Create</button>
                        <button className="inline-btn cancel" onClick={() => setIsAddingTopicRecent(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="card-add-btn" onClick={() => {
                      setIsAddingTopicRecent(true);
                      setRecentTopicInput("");
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span>New topic</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Today's Tasks Card */}
              <div className="dashboard-card today-tasks-card">
                <div className="card-header">
                  <h3>
                    <svg className="card-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Today's Tasks
                  </h3>
                  <button className="card-header-link" onClick={() => setSidebarView("today")}>View all</button>
                </div>

                <div className="card-content">
                  {todayTasks.length === 0 ? (
                    <div className="card-empty-state">
                      <span className="empty-icon-small">📅</span>
                      <p>No tasks due today. Enjoy your day!</p>
                    </div>
                  ) : (
                    <ul className="dashboard-task-list-simple">
                      {todayTasks.map(item => {
                        const topicName = normalizeTopic(item.topic);
                        const dotColor = getTopicColor(topicName);
                        return (
                          <li
                            key={item._id}
                            className="dashboard-task-item-simple"
                            onClick={() => selectTopic(topicName)}
                          >
                            {/* Folder colour box — matches Recent Topics icon */}
                            <div
                              className="topic-icon-folder"
                              style={{ backgroundColor: dotColor + "1a", color: dotColor }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M16 2v4M8 2v4M3 10h18" />
                              </svg>
                            </div>
                            <div className="task-info-main">
                              <span className="task-text-simple">{item.text}</span>
                              <span className="task-topic-tag">
                                <span className="topic-dot" style={{ backgroundColor: dotColor }} />
                                {topicName}
                              </span>
                            </div>
                            <div className="task-time-right">
                              {formatTaskTime(item.dueDate)}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Filtered task views list (Today, Overdue, Completed) */}
        {sidebarView !== "mytasks" && sidebarView !== "topics" && sidebarView !== "invitations" && sidebarView !== "profile" && (
          <div className="dashboard-view">
            <div className="page-header">
              <button className="back-btn" onClick={handleBack} aria-label="Back to dashboard">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </button>
              <div className="page-title-group">
                <h1 className="page-title">
                  {sidebarView === "today" && "Today"}
                  {sidebarView === "important" && "Overdue"}
                  {sidebarView === "reminders" && "Reminders"}
                  {sidebarView === "topics" && "Topics"}
                </h1>
                <span className="page-count">{dashboardTasks.length} {sidebarView === "reminders" ? "reminders" : "tasks"}</span>
              </div>
            </div>

            {dashboardTasks.length === 0 ? (
              <div className="empty-dashboard">
                <div className="empty-icon">
                  {sidebarView === "today" && "📅"}
                  {sidebarView === "important" && "⏰"}
                  {sidebarView === "reminders" && "🔔"}
                  {sidebarView === "mytasks" && "🎉"}
                </div>
                <p className="empty-dashboard-text">
                  {sidebarView === "today" && "No tasks due today. Enjoy your day!"}
                  {sidebarView === "important" && "No overdue tasks. Great job staying on track!"}
                  {sidebarView === "reminders" && "No active reminders set."}
                  {sidebarView === "mytasks" && "All caught up! No pending tasks."}
                </p>
              </div>
            ) : (
              <ul className="task-list dashboard-task-list">
                {dashboardTasks.map(item => (
                  <Task
                    key={item._id}
                    task={item}
                    toggleTask={handleToggleTask}
                    deleteTask={handleDeleteTask}
                    editTask={handleEditTask}
                    updateTaskDetails={handleUpdateTaskDetails}
                    updateTaskReminder={updateTaskReminder}
                    currentUser={currentUser}
                    readOnly={sidebarView === "reminders"}
                  />
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Invitations view list */}
        {sidebarView === "invitations" && (
          <div className="dashboard-view">
            <div className="page-header">
              <button className="back-btn" onClick={handleBack} aria-label="Back to dashboard">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </button>
              <div className="page-title-group">
                <h1 className="page-title">Topic Invitations</h1>
                {invitations.length > 0 && (
                  <span className="page-count">{invitations.length} pending</span>
                )}
              </div>
            </div>

            {invitations.length === 0 ? (
              <div className="empty-dashboard">
                <div className="empty-icon">✉️</div>
                <p className="empty-dashboard-text">No pending invitations. When someone invites you to a topic, you will see it here.</p>
              </div>
            ) : (
              <div className="invitations-grid">
                {invitations.map((invite) => {
                  const folderColor = getTopicColor(invite.topicName);
                  return (
                    <div key={invite._id} className="invite-card">
                      <div className="invite-card-header" style={{ borderLeftColor: folderColor }}>
                        <div className="topic-icon-folder" style={{ backgroundColor: folderColor + "1a", color: folderColor }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                        <div className="invite-details">
                          {(() => {
                            const owner = invite.members?.find(m => m.role === "owner") || {};
                            const ownerName = invite.ownerName || owner.name || "Someone";
                            const ownerEmail = invite.ownerEmail || owner.email || "Unknown Email";
                            return (
                              <>
                                <h3>{invite.topicName}</h3>
                                <p>Invited by <strong>{ownerName}</strong> ({ownerEmail})</p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="invite-actions">
                        <button className="invite-accept-btn" onClick={() => acceptInvitation(invite._id)}>
                          Accept
                        </button>
                        <button className="invite-decline-btn" onClick={() => declineInvitation(invite._id)}>
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Topic task view */}
        {sidebarView === "topics" && selectedTopic && (
          <div className="topic-workspace">
            {/* Topic header */}
            <div className="topic-header">
              <div className="topic-header-left">
                <button className="back-btn" onClick={handleBack} aria-label="Back to topics">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                </button>

                {isEditingTopic ? (
                  <div className="topic-title-edit-row">
                    <input
                      className="topic-title-input"
                      type="text"
                      value={topicDraft}
                      onChange={e => setTopicDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveTopicEdit();
                        if (e.key === "Escape") cancelTopicEdit();
                      }}
                      autoFocus
                    />
                    <button className="topic-save-btn" onClick={saveTopicEdit}>Save</button>
                    <button className="topic-cancel-btn" onClick={cancelTopicEdit}>Cancel</button>
                  </div>
                ) : (
                  <div className="topic-title-row">
                    <h1 className="topic-title">{selectedTopic}</h1>

                    {/* Member avatars — only when 2+ members */}
                    {selectedCollab && selectedCollab.members.length > 1 && (
                      <div className="member-avatars">
                        {selectedCollab.members.slice(0, 4).map(m => (
                          <div key={m.userId} className="mini-avatar" title={m.name}>
                            {m.name?.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {selectedCollab.members.length > 4 && (
                          <div className="mini-avatar more">+{selectedCollab.members.length - 4}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="topic-header-actions">
                {!isEditingTopic && (
                  <>
                    {/* Edit topic name — only owner or private topic */}
                    {(!selectedCollab || isCollabOwner) && (
                      <button className="header-action-btn edit-btn" onClick={beginTopicEdit} title="Rename topic">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        <span>Rename</span>
                      </button>
                    )}

                    {/* Share / Manage members button */}
                    {(!selectedCollab || selectedCollab.members.length <= 1) ? (
                      <button className="header-action-btn share-btn" onClick={selectedCollab ? () => setShowMembersModal(true) : handleShareTopic} title="Share with team">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        <span>Share</span>
                      </button>
                    ) : (
                      <button
                        className="header-action-btn members-btn"
                        onClick={() => setShowMembersModal(true)}
                        title="Manage members"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>{selectedCollab.members.length} Members</span>
                      </button>
                    )}

                    {/* Delete Topic — owner or private */}
                    {(!selectedCollab || isCollabOwner) && (
                      <button
                        className="header-action-btn delete-all-btn"
                        onClick={handleDeleteTopic}
                        title="Delete Topic"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    )}

                    {/* Leave Topic — members only */}
                    {isMemberOnly && (
                      <button
                        className="header-action-btn delete-all-btn"
                        onClick={handleLeaveTopic}
                        title="Leave this topic"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Leave</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {shareError && <p className="error-banner">{shareError}</p>}
            {error && <p className="error-banner">{error}</p>}


            {/* Topic stats grid */}
            <div className="topic-stats-grid">
              <div className="dashboard-stat-card tasks">
                <div className="stat-icon-wrapper blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="9" x2="15" y2="9" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="15" y2="17" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Tasks</span>
                  <span className="stat-value">{totalCount}</span>
                </div>
              </div>

              <div className="dashboard-stat-card completed">
                <div className="stat-icon-wrapper green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Completed</span>
                  <span className="stat-value">{completedCount}</span>
                </div>
              </div>

              <div className="dashboard-stat-card pending">
                <div className="stat-icon-wrapper orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Pending</span>
                  <span className="stat-value">{pendingCount}</span>
                </div>
              </div>

              <div className="dashboard-stat-card upcoming">
                <div className="stat-icon-wrapper lightblue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Upcoming</span>
                  <span className="stat-value">{topicUpcomingTasks.length}</span>
                  {nextUpcomingTaskDateText && (
                    <span className="stat-subtext">Next: {nextUpcomingTaskDateText}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Split layout */}
            <div className="topic-workspace-body">
              {/* Left Column: Tasks */}
              <div className="topic-workspace-left">
                <div className="topic-dashboard-card tasks-card">
                  <div className="topic-card-header">
                    <h3>Tasks</h3>
                    <div className="task-search-bar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search tasks…"
                        value={taskSearch}
                        onChange={e => setTaskSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="topic-card-content">
                    {/* Quick add task */}
                    <div className="quick-add-bar">
                      <div className="quick-add-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        className="quick-add-input"
                        placeholder={`Add a task to ${selectedTopic}…`}
                        value={task}
                        onChange={e => setTask(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAddTask()}
                      />
                      <label className="due-date-picker">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8 2v4M16 2v4" />
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M3 10h18" />
                        </svg>
                        <span>{selectedDueDateText || "Due date"}</span>
                        <input
                          type="datetime-local"
                          value={dueDate}
                          onChange={e => setDueDate(e.target.value)}
                          onClick={e => { try { e.target.showPicker(); } catch (_) {} }}
                        />
                      </label>
                      <button className="add-task-btn" onClick={handleAddTask}>Add Task</button>
                    </div>

                    {/* Task list */}
                    <div className="task-area">
                      {status === "loading" ? (
                        <div className="loading-state">
                          <div className="loading-spinner" />
                          <p>Loading tasks…</p>
                        </div>
                      ) : totalCount === 0 ? (
                        <div className="empty-state-area">
                          <div className="empty-icon-large">📋</div>
                          <p className="empty-title">No tasks yet</p>
                          <p className="empty-subtitle">Add your first task above to get started.</p>
                        </div>
                      ) : filteredTasks.length === 0 ? (
                        <div className="empty-state-area">
                          <p className="empty-title">No tasks match your search</p>
                        </div>
                      ) : (
                        <ul className="task-list">
                          {filteredTasks.map(item => {
                            // Per-task permission: only enforced in real team topics (2+ members)
                            const isMyTask = item.userId === currentUser?.id;
                            const isOwner  = selectedCollab?.ownerId === currentUser?.id;
                            const canEdit  = !isActiveTeam || isMyTask || isOwner;

                            return (
                              <Task
                                key={item._id}
                                task={item}
                                toggleTask={handleToggleTask}
                                deleteTask={canEdit ? handleDeleteTask : null}
                                editTask={canEdit ? handleEditTask : null}
                                updateTaskDetails={canEdit ? handleUpdateTaskDetails : null}
                                updateTaskReminder={updateTaskReminder}
                                currentUser={currentUser}
                                readOnly={!canEdit}
                                memberView={!canEdit}
                                isTeamTask={isActiveTeam}
                              />
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Members Modal */}
      {showMembersModal && selectedCollab && (
        <MembersModal
          collab={selectedCollab}
          currentUserId={currentUser?.id}
          onInvite={inviteMember}
          onRemove={removeMember}
          onClose={() => setShowMembersModal(false)}
        />
      )}
    </div>
  );
}

export default Home;
