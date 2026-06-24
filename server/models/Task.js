const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true,
    default: "General"
  },
  completed: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date
  },
  userId: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("Task", TaskSchema);
