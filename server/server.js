const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const taskRoutes = require("./routes/taskRoutes");
const app = express();

mongoose.set("bufferCommands", false);

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/api/tasks", taskRoutes);

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
  "mongodb://srinath:sri167@ac-1wwbplk-shard-00-00.ljp40yo.mongodb.net:27017,ac-1wwbplk-shard-00-01.ljp40yo.mongodb.net:27017,ac-1wwbplk-shard-00-02.ljp40yo.mongodb.net:27017/task?ssl=true&replicaSet=atlas-blvx9b-shard-0&authSource=admin&appName=Cluster0",
  { serverSelectionTimeoutMS: 30000 }
)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
    });
  })
  .catch(err => {
    console.log("MongoDB connection failed:", err.message);
    process.exit(1);
  });
