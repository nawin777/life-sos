import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

function niceRoleLabel(role) {
  if (role === "helper") return "Helper / Volunteer";
  if (role === "police") return "Police / Authority";
  return "Normal User";
}

export default function RegisterPage() {
  const { role } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const displayRole = niceRoleLabel(role);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !pass.trim()) {
      setError("Please fill all fields.");
      return;
    }
    if (pass.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const email = `${phone.trim()}@sos.local`; // temporary "email" from phone
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const uid = cred.user.uid;

      await setDoc(doc(db, "users", uid), {
        name,
        phone,
        role: role || "normal",
        createdAt: new Date(),
      });

      // for now just send to a placeholder dashboard
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
      if (e.code === "auth/email-already-in-use") {
        setError("This phone is already registered.");
      } else {
        setError(e.message);
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
          <div className="header-title">Register</div>
          <div className="header-subtitle">{displayRole}</div>
        </div>
        <span />
      </div>

      <div className="content">
        <div className="glass-card">
          <div className="field-label">Full Name</div>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />

          <div className="field-label">Phone</div>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
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
            <div style={{ color: "red", fontSize: 12, marginTop: 4 }}>{error}</div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? "Creating account..." : "Continue"}
          </button>
        </div>
      </div>

      <div className="footer-note">Passwords are stored securely with Firebase Auth.</div>
    </div>
  );
}