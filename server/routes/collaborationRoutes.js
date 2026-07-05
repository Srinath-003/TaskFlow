const express = require("express");
const router = express.Router();
const Collaboration = require("../models/Collaboration");
const User = require("../models/User");
const { sendInviteEmail } = require("../emailService");

// GET collaborations for a user
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }
    const collaborations = await Collaboration.find({
      "members.userId": userId
    });
    res.json(collaborations);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch collaborations", error: err.message });
  }
});

// CREATE a collaboration
router.post("/", async (req, res) => {
  try {
    const { topicName, ownerId } = req.body;
    if (!topicName || !ownerId) {
      return res.status(400).json({ message: "topicName and ownerId are required" });
    }

    // Check if collaboration already exists for this topic and owner
    let collab = await Collaboration.findOne({ topicName, ownerId });
    if (collab) {
      return res.json(collab);
    }

    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Owner user not found" });
    }

    collab = new Collaboration({
      topicName,
      ownerId,
      ownerName: owner.name || owner.email,
      ownerEmail: owner.email,
      members: [
        {
          userId: owner._id.toString(),
          email: owner.email,
          name: owner.name,
          role: "owner"
        }
      ]
    });

    const savedCollab = await collab.save();
    res.status(201).json(savedCollab);
  } catch (err) {
    res.status(500).json({ message: "Failed to create collaboration", error: err.message });
  }
});

// GET invitations for a user
router.get("/invitations", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }
    const invitations = await Collaboration.find({
      "pendingInvitations.userId": userId
    });
    res.json(invitations);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invitations", error: err.message });
  }
});

// INVITE a user by email
router.post("/:id/invite", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, userId } = req.body; // userId is the requester

    if (!email || !userId) {
      return res.status(400).json({ message: "email and userId are required" });
    }

    const collab = await Collaboration.findById(id);
    if (!collab) {
      return res.status(404).json({ message: "Collaboration not found" });
    }

    // Only owner can invite
    if (collab.ownerId !== userId) {
      return res.status(403).json({ message: "Only the topic owner can invite members" });
    }

    const inviteeEmail = email.trim().toLowerCase();
    const invitee = await User.findOne({ email: inviteeEmail });
    if (!invitee) {
      return res.status(404).json({ message: `User with email "${email}" not found. Ask them to sign up first!` });
    }

    // Check if already a member
    const isMember = collab.members.some(m => m.userId === invitee._id.toString());
    if (isMember) {
      return res.status(400).json({ message: "User is already a member of this collaboration" });
    }

    // Check if invitation already pending
    const isPending = collab.pendingInvitations && collab.pendingInvitations.some(m => m.userId === invitee._id.toString());
    if (isPending) {
      return res.status(400).json({ message: "User has already been invited to this collaboration" });
    }

    if (!collab.pendingInvitations) {
      collab.pendingInvitations = [];
    }

    collab.pendingInvitations.push({
      userId: invitee._id.toString(),
      email: invitee.email,
      name: invitee.name
    });

    const updatedCollab = await collab.save();

    // Fetch the inviter's details to show their name in the email
    const inviter = await User.findById(userId);
    const inviterName = inviter ? (inviter.name || inviter.email) : "Someone";

    // Send invitation email in the background
    sendInviteEmail(invitee.email, invitee.name || invitee.email, collab.topicName, inviterName)
      .catch(err => console.log("[Email] Failed to send invite email:", err.message));

    res.json(updatedCollab);
  } catch (err) {
    res.status(500).json({ message: "Failed to invite member", error: err.message });
  }
});

// ACCEPT invitation
router.post("/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const collab = await Collaboration.findById(id);
    if (!collab) {
      return res.status(404).json({ message: "Collaboration not found" });
    }

    if (!collab.pendingInvitations) {
      collab.pendingInvitations = [];
    }

    const pendingIdx = collab.pendingInvitations.findIndex(p => p.userId === userId);
    if (pendingIdx === -1) {
      return res.status(400).json({ message: "No pending invitation found for this user" });
    }

    const invitee = collab.pendingInvitations[pendingIdx];

    collab.members.push({
      userId: invitee.userId,
      email: invitee.email,
      name: invitee.name,
      role: "member"
    });

    collab.pendingInvitations.splice(pendingIdx, 1);

    const updatedCollab = await collab.save();
    res.json(updatedCollab);
  } catch (err) {
    res.status(500).json({ message: "Failed to accept invitation", error: err.message });
  }
});

// DECLINE invitation
router.post("/:id/decline", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const collab = await Collaboration.findById(id);
    if (!collab) {
      return res.status(404).json({ message: "Collaboration not found" });
    }

    if (!collab.pendingInvitations) {
      collab.pendingInvitations = [];
    }

    collab.pendingInvitations = collab.pendingInvitations.filter(p => p.userId !== userId);

    const updatedCollab = await collab.save();
    res.json(updatedCollab);
  } catch (err) {
    res.status(500).json({ message: "Failed to decline invitation", error: err.message });
  }
});

// REMOVE a member (or leave)
router.delete("/:id/members/:memberId", async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const requesterId = req.body.userId || req.query.userId;

    if (!requesterId) {
      return res.status(400).json({ message: "requester userId is required" });
    }

    const collab = await Collaboration.findById(id);
    if (!collab) {
      return res.status(404).json({ message: "Collaboration not found" });
    }

    // Allow if requester is owner, OR if requester is the member leaving
    const isOwner = collab.ownerId === requesterId;
    const isSelfLeaving = memberId === requesterId;

    if (!isOwner && !isSelfLeaving) {
      return res.status(403).json({ message: "You do not have permission to remove this member" });
    }

    // Prevent removing the owner unless deleting the entire collab
    if (memberId === collab.ownerId) {
      return res.status(400).json({ message: "Cannot remove the owner of the collaboration" });
    }

    collab.members = collab.members.filter(m => m.userId !== memberId);
    const updatedCollab = await collab.save();
    res.json(updatedCollab);
  } catch (err) {
    res.status(500).json({ message: "Failed to remove member", error: err.message });
  }
});

module.exports = router;
