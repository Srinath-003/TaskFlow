require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");
const collaborationRoutes = require("./routes/collaborationRoutes");
require("./emailService");

const { startScheduler } = require("./taskScheduler");
const app = express();

mongoose.set("bufferCommands", false);

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/api/tasks", taskRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/collaborations", collaborationRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.get("/health", (req, res) => {
  res.json({
    server: "running",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    readyState: mongoose.connection.readyState
  });
});

// Port
const PORT = 5000;
console.log("Trying to connect...");
mongoose.connect(
  process.env.MONGO_URI,
  { serverSelectionTimeoutMS: 30000 }
)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
      startScheduler();
    });
  })
  .catch(err => {
    console.log("MongoDB connection failed:", err.message);
    process.exit(1);
  });
