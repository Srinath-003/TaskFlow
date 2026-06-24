import { useState, useEffect } from "react";
import axios from "axios";

function Login() {
  useEffect(() => {
    if (sessionStorage.getItem("token")) {
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
        "https://task-manager-6wdd.onrender.com/api/auth/signup",
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
        "https://task-manager-6wdd.onrender.com/api/auth/login",
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
    window.location.href = "https://task-manager-6wdd.onrender.com/api/auth/google";
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
          {isLogin ? "Task Manager" : "Create Account"}
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

        {/* Google Oauth Option */}
        {isLogin && (
          <>
            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">or continue with</span>
              <div className="login-divider-line" />
            </div>

            <button
              type="button"
              className="btn-google"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </>
        )}

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