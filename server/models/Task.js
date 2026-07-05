const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
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
    completedBy: {
      type: String,
      default: null
    },
    completedByName: {
      type: String,
      default: null
    },
    dueDate: {
      type: Date
    },
    userId: {
      type: String,
      required: true
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    reminders: [
      {
        userId: {
          type: String,
          required: true
        },
        remindAt: {
          type: Date,
          required: true
        },
        repeat: {
          type: String,
          default: "once"
        },
        active: {
          type: Boolean,
          default: true
        },
        notificationSent: {
          type: Boolean,
          default: false
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);
