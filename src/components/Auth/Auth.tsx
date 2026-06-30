import React, { useState, useContext } from "react";
import Context from "../../context";
import { toast } from "react-toastify";
import { config } from "../../config";
import "./auth.scss";

export default function Auth() {
  const { updateUserInfo } = useContext(Context);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (username.length < 3) {
      toast.error("Username must be at least 3 characters.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/signup";
      const response = await fetch(`${config.api}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      toast.success(data.message || "Welcome!");
      
      // Save details to localStorage
      localStorage.setItem("aviator_token", data.token);
      localStorage.setItem("aviator_user", JSON.stringify(data.user));

      // Update Context
      if (updateUserInfo) {
        updateUserInfo({
          token: data.token,
          userName: data.user.username,
          balance: data.user.balance,
          userType: data.user.isAdmin, // Store admin privilege
        });
      }

    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-bg-animation">
        <div className="glowing-orb orb-1"></div>
        <div className="glowing-orb orb-2"></div>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <div className="plane-logo">✈️</div>
          <h2>AVIATOR CRASH</h2>
          <p>SERVER CONTROL INTEGRATED</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`tab-btn ${isLogin ? "active" : ""}`}
            onClick={() => {
              setIsLogin(true);
              setPassword("");
              setConfirmPassword("");
            }}
          >
            Login
          </button>
          <button
            className={`tab-btn ${!isLogin ? "active" : ""}`}
            onClick={() => {
              setIsLogin(false);
              setPassword("");
              setConfirmPassword("");
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="spinner-loader"></span>
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Connected to Database: <span className="status-indicator online"></span> MySQL (XAMPP)
          </p>
        </div>
      </div>
    </div>
  );
}
