import { useState, useEffect } from "react";

function Header() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  const handleTitleClick = () => {
    window.location.hash = "/";
  };

  return (
    <header className="app-header">
      <h1
        onClick={handleTitleClick}
        onKeyDown={(e) => e.key === "Enter" && handleTitleClick()}
        role="button"
        tabIndex={0}
      >
        Task Manager
      </h1>

      <div className="header-actions">
        <button
          className="header-button theme-toggle"
          onClick={() => setIsDark(!isDark)}
          aria-label="Toggle dark mode"
        >
          {isDark ? "Light mode" : "Dark mode"}
        </button>
        <button className="header-button btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
