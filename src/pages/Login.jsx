import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_URL || "https://task-manager-6wdd.onrender.com");

function Login() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const user = params.get("user");
    const error = params.get("error");

    if (token && user) {
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", user);
      window.location.href = "/";
    } else if (error) {
      setErrorMsg(error);
    } else if (sessionStorage.getItem("token")) {
      window.location.href = "/";
    }
  }, []);

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    if (isLogin) {
      await handleLogin();
    } else {
      await handleSignup();
    }
    setIsLoading(false);
  };

  const handleSignup = async () => {
    try {
      await axios.post(
        `${API_BASE}/api/auth/signup`,
        { name, email, password }
      );
      alert("Account created successfully");
      setIsLogin(true);
      setPassword("");
      setName(""); // Clear name field after successful registration
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Signup failed");
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/login`,
        { email, password }
      );
      sessionStorage.setItem("token", res.data.token);
      sessionStorage.setItem("user", JSON.stringify(res.data.user));
      window.location.href = "/";
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Login failed");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Brand icon */}
        <div className="login-brand-icon">
          <svg viewBox="0 0 24 24">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>

        <h2 className="login-title">
          {isLogin ? "TaskFlow" : "Create Account"}
        </h2>
        <p className="login-subtitle">
          {isLogin ? "Sign in to your workspace" : "Get started for free today"}
        </p>

        {errorMsg && (
          <div className="login-error">{errorMsg}</div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Full name — signup only */}
          {!isLogin && (
            <div className="login-field">
              <label className="login-field-label" htmlFor="name">Full name</label>
              <div className="login-field-wrap">
                <span className="login-field-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="name"
                  type="text"
                  className="login-input"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="login-field">
            <label className="login-field-label" htmlFor="email">Email address</label>
            <div className="login-field-wrap">
              <span className="login-field-icon">
                <svg viewBox="0 0 24 24">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                className="login-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-field-label" htmlFor="password">Password</label>
            <div className="login-field-wrap">
              <span className="login-field-icon">
                <svg viewBox="0 0 24 24">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Forgot password — login only */}
          {isLogin && (
            <div className="login-forgot-row">
              <button type="button" className="login-forgot">
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary-login"
            disabled={isLoading}
          >
            {isLoading
              ? "Please wait..."
              : isLogin
              ? "Sign in"
              : "Create account"}
          </button>

        </form>



        {/* Toggle login / signup */}
        <p className="login-toggle-row">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            type="button"
            className="login-toggle-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg("");
              setName("");
              setPassword("");
            }}
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

        {/* Persistent compliance footer to maintain layout continuity */}
        <p className="login-terms">
          By continuing you agree to our{" "}
          <a href="#">Terms of Service</a> and{" "}
          <a href="#">Privacy Policy</a>
        </p>

      </div>
    </div>
  );
}

export default Login;