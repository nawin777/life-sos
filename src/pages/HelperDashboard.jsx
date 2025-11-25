import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

export default function HelperDashboard({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("help");

  return (
    <div className="view">
      <Header
        title="Helper Panel"
        subtitle="Handle nearby SOS cases"
        showBack={false}
        showProfile={true}
        onProfile={() => navigate("/profile")}
      />
      <div className="content">
        <div className="glass-card">
          <div className="tabs">
            <div
              className={`tab ${activeTab === "help" ? "active" : ""}`}
              onClick={() => setActiveTab("help")}
            >
              Help Requests
            </div>
            <div
              className={`tab ${activeTab === "offer" ? "active" : ""}`}
              onClick={() => setActiveTab("offer")}
            >
              Offer Help
            </div>
          </div>

          {activeTab === "help" ? (
            <div>
              <div className="list-card">
                <div className="list-card-title">Case #1045 • High Priority</div>
                <div className="list-card-sub">
                  Near main gate • 200m • Tap to join
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={() => navigate("/group/1045")}
              >
                Respond & Join Group
              </button>
            </div>
          ) : (
            <div>
              <div className="list-card">
                <div className="list-card-title">Your Availability</div>
                <div className="list-card-sub">
                  You are considered active in this prototype.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="footer-note">Prototype • Frontend only</div>
    </div>
  );
}
