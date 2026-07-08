const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");

const router = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createSessionToken = () => crypto.randomBytes(32).toString("hex");

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => ({
  hash: crypto.scryptSync(password, salt, 64).toString("hex"),
  salt
});

const isPasswordValid = (password, user) => {
  if (!user.passwordHash || !user.passwordSalt) return false;
  const { hash } = hashPassword(password, user.passwordSalt);
  const savedHash = Buffer.from(user.passwordHash, "hex");
  const enteredHash = Buffer.from(hash, "hex");

  return savedHash.length === enteredHash.length && crypto.timingSafeEqual(savedHash, enteredHash);
};

const cleanUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email
});

router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database is not connected",
      error: "MongoDB Atlas connection is not ready"
    });
  }

  next();
});

router.post("/signup", async (req, res) => {
  try {
    const name = req.body.name && req.body.name.trim();
    const email = req.body.email && req.body.email.trim().toLowerCase();
    const password = req.body.password || "";

    if (!name || name.length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters." });
    }

    if (!email || !emailPattern.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordData = hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      sessionToken: createSessionToken()
    });

    res.status(201).json({ user: cleanUser(user), token: user.sessionToken });
  } catch (err) {
    res.status(500).json({ message: "Could not create your account.", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = req.body.email && req.body.email.trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user || !isPasswordValid(password, user)) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }

    user.sessionToken = createSessionToken();
    await user.save();

    res.json({ user: cleanUser(user), token: user.sessionToken });
  } catch (err) {
    res.status(500).json({ message: "Could not sign you in.", error: err.message });
  }
});


// UPDATE profile name
router.put("/profile/:id", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters." });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user: cleanUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Could not update profile.", error: err.message });
  }
});

// CHANGE password
router.put("/profile/:id/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All password fields are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!isPasswordValid(currentPassword, user)) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }
    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    await user.save();
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "Could not update password.", error: err.message });
  }
});

// VERIFY current password (used to unlock the new password fields)
router.post("/profile/:id/verify-password", async (req, res) => {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ message: "Password is required." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!isPasswordValid(currentPassword, user)) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }
    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({ message: "Verification failed.", error: err.message });
  }
});

module.exports = router;
