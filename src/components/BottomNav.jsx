import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav({ role, nearbyCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname;

  const isActive = (path) => current === path;

  // Inline style for the pointer cursor
  const itemStyle = { cursor: "pointer" };

  return (
    <div className="bottom-nav">
      {/* 1. HOME */}
      <div 
        className={`bottom-item ${isActive("/dashboard") ? "active" : ""}`} 
        onClick={() => navigate("/dashboard")}
        style={itemStyle} // <--- Adds Hand Cursor
      >
        <div className="bottom-item-inner">
          <i className="fas fa-home bottom-item-icon"></i>
          <span className="bottom-item-label">Home</span>
        </div>
      </div>

      {/* 2. NEARBY (With Badge) */}
      {(role === "helper" || role === "police") && (
        <div 
          className={`bottom-item ${isActive("/nearby") ? "active" : ""}`} 
          onClick={() => navigate("/nearby")}
          style={itemStyle} // <--- Adds Hand Cursor
        >
          <div className="bottom-item-inner" style={{ position: "relative" }}>
            <i className="fas fa-map-marker-alt bottom-item-icon"></i>
            <span className="bottom-item-label">Nearby</span>
            
            {/* BADGE LOGIC */}
            {nearbyCount > 0 && (
              <span className="bottom-item-badge" style={{
                position: "absolute",
                top: "-6px",
                right: "-10px",
                backgroundColor: "#ef4444",
                color: "white",
                fontSize: "10px",
                fontWeight: "bold",
                borderRadius: "50%",
                padding: "2px 5px",
                minWidth: "18px",
                textAlign: "center",
                border: "2px solid white"
              }}>
                {nearbyCount > 9 ? "9+" : nearbyCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. NEWS */}
      <div 
        className={`bottom-item ${isActive("/news") ? "active" : ""}`} 
        onClick={() => navigate("/news")}
        style={itemStyle} // <--- Adds Hand Cursor
      >
        <div className="bottom-item-inner">
          <i className="fas fa-newspaper bottom-item-icon"></i>
          <span className="bottom-item-label">News</span>
        </div>
      </div>

      {/* 4. PROFILE */}
      <div 
        className={`bottom-item ${isActive("/profile") ? "active" : ""}`} 
        onClick={() => navigate("/profile")}
        style={itemStyle} // <--- Adds Hand Cursor
      >
        <div className="bottom-item-inner">
          <i className="fas fa-user bottom-item-icon"></i>
          <span className="bottom-item-label">Profile</span>
        </div>
      </div>
    </div>
  );
}