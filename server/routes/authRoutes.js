const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");

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

const getBackendUrl = (req) => {
  return process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
};

router.get("/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.setHeader("Content-Type", "text/html");
    return res.status(500).send(`
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h2 style="color: #e53e3e; margin-top: 0;">Google OAuth Configuration Missing</h2>
        <p>Google Client ID and Client Secret are not configured in the server's <code>.env</code> file.</p>
        <p>To set this up:</p>
        <ol style="line-height: 1.6;">
          <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" style="color: #3182ce; text-decoration: none; font-weight: 500;">Google Cloud Console</a>.</li>
          <li>Create a project (or use an existing one) and configure the OAuth consent screen.</li>
          <li>Go to <strong>Credentials</strong> &rarr; <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong> (Web Application).</li>
          <li>Set the Authorized redirect URIs to: <code>http://localhost:5000/api/auth/google/callback</code> (and your production URL if applicable).</li>
          <li>Copy the client ID and client secret, and add them to <code>server/.env</code>:
            <pre style="background: #f7fafc; padding: 12px; border-radius: 4px; border: 1px solid #edf2f7; font-family: monospace; overflow-x: auto;">
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:5173</pre>
          </li>
        </ol>
        <p style="margin-bottom: 0;"><a href="javascript:history.back()" style="color: #4a5568; font-weight: 500;">&larr; Go Back</a></p>
      </div>
    `);
  }

  const redirectUri = `${getBackendUrl(req)}/api/auth/google/callback`;
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=profile%20email&prompt=select_account`;

  res.redirect(googleAuthUrl);
});

router.get("/google/callback", async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=Google authentication failed: Authorization code missing`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${getBackendUrl(req)}/api/auth/google/callback`;

    // 1. Exchange auth code for access token
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    });

    const { access_token } = tokenRes.data;

    // 2. Retrieve user details using access token
    const userRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { email, name } = userRes.data;

    if (!email) {
      return res.redirect(`${frontendUrl}/login?error=Google account does not provide email`);
    }

    // 3. Find or create the user in the database
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || "Google User",
        email: email,
        sessionToken: createSessionToken()
      });
    } else {
      user.sessionToken = createSessionToken();
      await user.save();
    }

    // 4. Redirect frontend with session token and user details in query params
    const cleanUserObj = cleanUser(user);
    res.redirect(
      `${frontendUrl}/login?token=${user.sessionToken}&user=${encodeURIComponent(
        JSON.stringify(cleanUserObj)
      )}`
    );
  } catch (err) {
    console.error("Google login error:", err.message);
    const errorDetails = err.response?.data?.error_description || err.message;
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent("Google login failed: " + errorDetails)}`);
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
