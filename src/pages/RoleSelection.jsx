// src/pages/RoleSelection.jsx
import { useNavigate, Link } from "react-router-dom";

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="view">
      <div className="content center-content">
        <div className="role-card">
          <div className="role-title">Who are you?</div>
          <div className="role-subtitle">
            Choose how you want to use Life-SOS.
          </div>

          <div className="role-buttons">
            <button
              className="role-btn"
              onClick={() => navigate("/register/normal/step1")}
            >
              <span className="role-label">
                <span>🧍</span>
                <span>Normal User</span>
              </span>
              <span className="role-tag">Request help</span>
            </button>

            <button
              className="role-btn"
              onClick={() => navigate("/register/helper/step1")}
            >
              <span className="role-label">
                <span>🤝</span>
                <span>Helper</span>
              </span>
              <span className="role-tag">Offer help nearby</span>
            </button>

            <button
              className="role-btn"
              onClick={() => navigate("/register/police/step1")}
            >
              <span className="role-label">
                <span>👮</span>
                <span>Police / Authority</span>
              </span>
              <span className="role-tag">Monitor & respond</span>
            </button>
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{ color: "#2563eb", textDecoration: "none" }}
            >
              Log in
            </Link>
          </div>
        </div>
      </div>

      <div className="footer-note">Life-SOS • Secure emergency assistance</div>
    </div>
  );
}
