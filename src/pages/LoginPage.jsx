// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !pass.trim()) {
      setError("Please enter phone and password.");
      return;
    }

    try {
      setBusy(true);
      setError("");

      // we used phone@sos.local as email when registering
      const email = `${phone.trim()}@sos.local`;

      await signInWithEmailAndPassword(auth, email, pass);

      navigate("/dashboard");
    } catch (e) {
      console.error(e);
      if (e.code === "auth/user-not-found") {
        setError("No account found for this phone.");
      } else if (e.code === "auth/wrong-password") {
        setError("Incorrect password. Try again.");
      } else {
        setError("Invalid Credentials. Try again");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view">
      <div className="header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ◀ Back
        </button>
        <div>
          <div className="header-title">Log in</div>
          <div className="header-subtitle">Access your Life-SOS account</div>
        </div>
        <span />
      </div>

      <div className="content">
        <div className="glass-card">
          <div className="field-label">Phone</div>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your Phone number"
          />

          <div className="field-label">Password</div>
          <input
            className="input"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <div style={{ color: "red", fontSize: 12, marginTop: 4 }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleLogin}
            disabled={busy}
            style={{ marginTop: 8 }}
          >
            {busy ? "Logging in…" : "Log in"}
          </button>

          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link to="/" style={{ color: "#2563eb", textDecoration: "none" }}>
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
