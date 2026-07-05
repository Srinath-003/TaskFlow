# 📋 Task Manager

A full-stack collaborative task management web application built with **React + Vite** on the frontend and **Node.js + Express + MongoDB** on the backend. Features real-time task tracking, team collaboration, email reminders, dark mode, and a clean modern UI.

---

## ✨ Features

### 🗂️ Task Management
- Create, edit, and delete tasks with optional due dates and times
- Mark tasks as complete / incomplete
- Overdue detection — tasks past their due date are highlighted
- Organize tasks into **Topics** (custom categories/projects)

### 👥 Team Collaboration
- Invite team members to Topics via **email invitation**
- Collaborate on shared tasks within a topic workspace
- View which team member completed a task (`Completed by: Name` badge)
- Role-aware permissions — topic owner can manage members and delete tasks

### 🔔 Smart Reminders
- Set per-task reminders with a specific **date**, **time**, and **repeat** option (`Once`, `Daily`, `Weekly`)
- Reminders are **per-user** — only the person who set a reminder gets notified
- Email notifications sent automatically when the reminder time is due
- Works across personal tasks and shared team tasks
- Dedicated **Reminders** sidebar view showing all your active reminders
- Toggle reminders on/off; changes auto-save instantly (no Save button needed)

### 🧭 Sidebar Views

| View | Description |
|------|-------------|
| 📊 **Dashboard** | Overview of all tasks grouped by topic |
| 📅 **Today** | Tasks due today |
| ⚠️ **Important** | Overdue tasks |
| 🔔 **Reminders** | Tasks where you have an active reminder set |
| 📁 **My Tasks** | All your personal tasks |
| 🤝 **Team Tasks** | Tasks from all collaborative topics |
| 📨 **Invitations** | Pending team invitations you received |

### 👤 Profile & Settings
- Update your **display name**
- **Change password** with secure current-password verification step
- **Dark Mode** toggle — persisted across sessions via `localStorage`
- One-click **Logout**

### 🌙 Dark Mode
- Full dark theme with a premium navy/slate color palette
- Toggle from the Profile Settings page
- Preference is saved in `localStorage` and restored on next visit

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| [React 19](https://react.dev/) | UI framework |
| [Vite 7](https://vitejs.dev/) | Build tool & dev server |
| [Axios](https://axios-http.com/) | HTTP client |
| [React Router v7](https://reactrouter.com/) | Client-side routing |
| Vanilla CSS | Styling (custom design system with CSS variables) |

### Backend

| Technology | Purpose |
|------------|---------|
| [Node.js](https://nodejs.org/) | Runtime |
| [Express 5](https://expressjs.com/) | Web framework |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Database |
| [Mongoose](https://mongoosejs.com/) | ODM |
| [Nodemailer](https://nodemailer.com/) | Email notifications |
| [node-cron](https://github.com/kelektiv/node-cron) | Reminder scheduler |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Password hashing |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | Authentication tokens |

---

## 📁 Project Structure

```
task_Manager/
├── src/                        # Frontend source
│   ├── pages/
│   │   ├── home.jsx            # Main app page (sidebar, views, profile)
│   │   └── Login.jsx           # Login / Register page
│   ├── components/
│   │   ├── Task.jsx            # Task item with reminder bell & edit
│   │   ├── MembersModal.jsx    # Team members management modal
│   │   └── header.jsx          # App header component
│   ├── App.jsx                 # Root component, all API calls & state
│   ├── App.css                 # Full design system + dark theme
│   └── main.jsx                # React entry point
│
├── server/                     # Backend source
│   ├── models/
│   │   ├── Task.js             # Task schema (with reminders array)
│   │   ├── User.js             # User schema
│   │   └── Collaboration.js    # Team collaboration schema
│   ├── routes/
│   │   ├── taskRoutes.js       # Task CRUD + reminder API
│   │   ├── authRoutes.js       # Auth, profile, password routes
│   │   └── collaborationRoutes.js  # Invite, accept, manage team
│   ├── emailService.js         # Nodemailer email sending helpers
│   ├── taskScheduler.js        # Cron job for reminder emails (every min)
│   └── server.js               # Express app entry point
│
├── index.html                  # Vite HTML entry
├── vite.config.js              # Vite configuration
└── package.json                # Frontend dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **npm** v9 or higher
- A **MongoDB Atlas** cluster (free tier works)
- A **Gmail** account with an App Password for email notifications

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/task-manager.git
cd task-manager
```

---

### 2. Install frontend dependencies

```bash
npm install
```

---

### 3. Install backend dependencies

```bash
cd server
npm install
```

---

### 4. Configure environment variables

Create a `.env` file inside the `server/` directory:

```env
MONGO_URI=your_mongodb_atlas_connection_string
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:5173
```

> **Getting a Gmail App Password:**
> 1. Enable 2-Factor Authentication on your Google account
> 2. Go to **Google Account → Security → App Passwords**
> 3. Generate a password for "Mail" and paste it as `EMAIL_PASS`

---

### 5. Run the backend server

```bash
# From the server/ directory
node server.js
```

The backend runs on **http://localhost:5000**

---

### 6. Run the frontend dev server

```bash
# From the project root
npm run dev
```

The frontend runs on **http://localhost:5173**

---

## 🔌 API Endpoints

### Auth — `/api/auth`

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login and receive JWT |
| `PUT` | `/profile/:id` | Update display name |
| `PUT` | `/profile/:id/password` | Change password |
| `POST` | `/verify-password` | Verify current password |

### Tasks — `/api/tasks`

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Get all tasks for the logged-in user |
| `POST` | `/` | Create a new task |
| `PUT` | `/:id` | Update task (text, due date, completed) |
| `PUT` | `/:id/reminder` | Set / update / remove a reminder |
| `DELETE` | `/:id` | Delete a task |

### Collaborations — `/api/collaborations`

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/invite` | Send a team invitation email |
| `POST` | `/accept` | Accept an invitation |
| `GET` | `/invitations` | Get pending invitations for current user |
| `GET` | `/team-tasks` | Get all tasks from shared topics |
| `DELETE` | `/member` | Remove a member from a topic |

---

## 📧 Email Notifications

The app sends automated emails in two scenarios:

1. **Team Invitations** — When a topic owner invites someone to collaborate, an invitation email with an accept link is sent.

2. **Task Reminders** — When a user-set reminder time is reached, an email is sent **only to that specific user**.

The reminder scheduler runs **every minute** via `node-cron`. Supported repeat modes:

| Mode | Behavior |
|------|----------|
| `Once` | Fires once, then deactivates |
| `Daily` | Resets automatically for the next day |
| `Weekly` | Resets automatically for the next week |

---

## 🌐 Deployment

### Frontend

```bash
npm run build
# Outputs to /dist — deploy to Vercel, Netlify, or any static host
```

### Backend

Deploy to **Render**, **Railway**, or any Node.js hosting platform. Set all environment variables via the platform's dashboard.

For production builds, set `VITE_API_URL` in your frontend environment to your deployed backend URL:

```env
VITE_API_URL=https://your-backend.onrender.com
```

---

## 🔐 Security Notes

- Passwords are hashed with **bcryptjs** — never stored in plaintext
- JWT tokens are used for session-based authentication
- Gmail **App Passwords** are used (not your real account password)
- The `.env` file is already listed in `.gitignore` — never commit it

---

## 📄 License

MIT License — free to use and modify for personal or commercial projects.
