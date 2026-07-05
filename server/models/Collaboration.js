const mongoose = require("mongoose");

const CollaborationSchema = new mongoose.Schema({
  topicName: {
    type: String,
    required: true
  },
  ownerId: {
    type: String,
    required: true
  },
  ownerName: {
    type: String
  },
  ownerEmail: {
    type: String
  },
  members: [
    {
      userId: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      role: {
        type: String,
        enum: ["owner", "member"],
        default: "member"
      }
    }
  ],
  pendingInvitations: [
    {
      userId: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      }
    }
  ]
});

module.exports = mongoose.model("Collaboration", CollaborationSchema);
