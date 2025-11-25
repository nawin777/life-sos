import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";

export default function GroupRoom({ user }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const backTarget = "/dashboard/user"; // later: choose based on role

  const handleBack = () => navigate(backTarget);

  const sendMessage = () => {
    // later: Firestore chat here
  };

  return (
    <div className="view">
      <Header
        title={`Group • ${id}`}
        subtitle="Victim • Helpers • Police"
        showBack={true}
        onBack={handleBack}
        showProfile={true}
        onProfile={() => navigate("/profile")}
      />
      <div className="content">
        <div className="video-shell">
          <div className="video-box">
            <div className="video-label">Live Call (mock)</div>
          </div>
        </div>

        <div className="glass-card chat-shell">
          <div className="field-label">Group Chat</div>
          <div className="chat-box">
            <div className="chat-msg other">
              <span className="bubble">
                <span className="sender">Police:</span> We are on our way.
              </span>
            </div>
            <div className="chat-msg other">
              <span className="bubble">
                <span className="sender">Helper:</span> I’m near your location.
              </span>
            </div>
          </div>
          <div className="chat-input-row">
            <input className="input chat-input" placeholder="Type a message..." />
            <button className="chat-send-btn" onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
      <div className="footer-note">Realtime chat TBD (Firestore)</div>
    </div>
  );
}
