import React from "react";
import Context from "../../context";
import { toast } from "react-toastify";

export default function AdminPanel() {
  const {
    GameState,
    currentTarget,
    simulationMode,
    setSimulationMode,
    adminCrashOverride,
    setAdminCrashOverride,
    isOverridePersistent,
    setIsOverridePersistent,
    userInfo,
    updateUserInfo,
    nextCrashVal,
    upcomingCrashVal
  } = React.useContext(Context);

  const [isOpen, setIsOpen] = React.useState(false);
  const [overrideInput, setOverrideInput] = React.useState("");

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(overrideInput);
    if (isNaN(val) || val < 1.0) {
      toast.error("Please enter a valid multiplier of 1.00 or higher.");
      return;
    }
    if (setAdminCrashOverride) {
      setAdminCrashOverride(val);
      toast.success(`Next crash multiplier set to ${val.toFixed(2)}x!`);
    }
  };

  const applyPreset = (val: number) => {
    setOverrideInput(val.toString());
    if (setAdminCrashOverride) {
      setAdminCrashOverride(val);
      toast.success(`Next crash multiplier set to ${val.toFixed(2)}x!`);
    }
  };

  const handleClearOverride = () => {
    setOverrideInput("");
    if (setAdminCrashOverride) {
      setAdminCrashOverride(null);
      toast.info("Cleared crash override. Reverting to random multiplier.");
    }
  };

  const refillBalance = () => {
    if (updateUserInfo) {
      updateUserInfo({
        balance: userInfo.balance + 5000
      });
      toast.success("Added 5,000 INR to your balance!");
    }
  };

  if (!userInfo?.userType) {
    return null;
  }

  return (
    <>
      {/* Floating Gear Button to open Admin Panel */}
      <button 
        className="admin-floating-btn" 
        onClick={() => setIsOpen(!isOpen)}
        title="Open Server Control Panel"
      >
        <span className="admin-gear-icon">⚙️</span>
        <span className="admin-btn-text">ADMIN</span>
      </button>

      {/* Admin Panel Sliding Sidebar */}
      <div className={`admin-sidebar ${isOpen ? "open" : ""}`}>
        <div className="admin-header">
          <h3>✈️ SERVER CONTROL</h3>
          <button className="admin-close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="admin-body">
          {/* Status Section */}
          <div className="admin-section">
            <h4>Live Game Status</h4>
            <div className="admin-status-grid">
              <div className="status-label">Phase:</div>
              <div className={`status-value phase-${GameState?.toLowerCase() || "idle"}`}>
                {GameState || "IDLE"}
              </div>

              <div className="status-label">Live Multiplier:</div>
              <div className="status-value current-mult">
                {currentTarget?.toFixed(2)}x
              </div>

              <div className="status-label">Current Round Target:</div>
              <div className="status-value target-val">
                <span style={{ color: "#2de359", fontWeight: "bold" }}>
                  {nextCrashVal !== undefined ? `${nextCrashVal.toFixed(2)}x` : "1.00x"}
                </span>
              </div>

              <div className="status-label">Next Round Target:</div>
              <div className="status-value target-val">
                <span style={{ color: "#e3ad2d", fontWeight: "bold" }}>
                  {upcomingCrashVal !== undefined ? `${upcomingCrashVal.toFixed(2)}x` : "1.00x"}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="admin-section">
            <h4>Server Mode</h4>
            <div className="admin-toggle-row">
              <span>Local Offline Simulator</span>
              <button 
                className={`admin-toggle-switch ${simulationMode ? "active" : ""}`}
                onClick={() => setSimulationMode && setSimulationMode(!simulationMode)}
              >
                <div className="switch-knob" />
              </button>
            </div>
            <p className="admin-tip">
              {simulationMode 
                ? "Bypassing server connection. Running local game loops and bot bets."
                : "Connecting to ws://localhost:5000."}
            </p>
          </div>

          {/* Crash Override Form */}
          {simulationMode && (
            <div className="admin-section">
              <h4>Crash Multiplier Override</h4>
              <form onSubmit={handleSaveOverride}>
                <div className="admin-input-group">
                  <input
                    type="number"
                    step="0.01"
                    min="1.0"
                    placeholder="Enter multiplier (e.g. 2.50)"
                    value={overrideInput}
                    onChange={(e) => setOverrideInput(e.target.value)}
                    className="admin-input"
                  />
                  <button type="submit" className="admin-btn primary">Set</button>
                </div>
              </form>

              {/* Presets */}
              <div className="admin-presets-grid">
                <button onClick={() => applyPreset(1.5)} className="preset-btn">1.5x</button>
                <button onClick={() => applyPreset(2.0)} className="preset-btn">2.0x</button>
                <button onClick={() => applyPreset(5.0)} className="preset-btn">5.0x</button>
                <button onClick={() => applyPreset(10.0)} className="preset-btn">10.0x</button>
                <button onClick={() => applyPreset(50.0)} className="preset-btn">50.0x</button>
              </div>

              {/* Options */}
              <div className="admin-toggle-row mt-10">
                <span>Keep override persistent</span>
                <button 
                  className={`admin-toggle-switch ${isOverridePersistent ? "active" : ""}`}
                  onClick={() => setIsOverridePersistent && setIsOverridePersistent(!isOverridePersistent)}
                >
                  <div className="switch-knob" />
                </button>
              </div>

              {adminCrashOverride !== null && (
                <button 
                  onClick={handleClearOverride} 
                  className="admin-btn danger mt-15 w-full"
                >
                  Clear Override
                </button>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="admin-section">
            <h4>Quick Actions</h4>
            <button onClick={refillBalance} className="admin-btn success w-full">
              💰 Refill +5,000 INR
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
