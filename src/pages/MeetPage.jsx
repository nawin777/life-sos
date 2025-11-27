// src/pages/MeetPage.jsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function MeetPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const handleEndCall = () => {
    // Navigating back unmounts this component, effectively ending the session for this user
    navigate(-1); 
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Live Conference</span>
        <button style={styles.hangupBtn} onClick={handleEndCall}>
          <i className="fas fa-phone-slash"></i> End
        </button>
      </div>
      <iframe
        src={`https://meet.jit.si/${groupId}#config.startWithAudioMuted=true&config.startWithVideoMuted=true`}
        style={styles.iframe}
        title="Jitsi Meet"
        allow="camera; microphone; fullscreen; display-capture"
      ></iframe>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "#000",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    height: "60px",
    background: "#1f2937",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    color: "white",
  },
  title: {
    fontWeight: 600,
    fontSize: "18px",
  },
  hangupBtn: {
    background: "#ef4444",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "20px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  iframe: {
    flex: 1,
    border: "none",
    width: "100%",
  },
};