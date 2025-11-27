import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import StepBar from "../components/StepBar";

function roleLabel(role) {
  if (role === "helper") return "Helper / Volunteer";
  if (role === "police") return "Police / Authority";
  return "Normal User";
}

export default function RegisterStep1() {
  const { role } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const displayRole = roleLabel(role);
  const currentStep = 1;
  const completedSteps = 0;

  const handleNext = async () => {
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
      const email = `${phone.trim()}@sos.local`; 
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const uid = cred.user.uid;

      await setDoc(doc(db, "users", uid), {
        name,
        phone,
        role: role || "normal",
        createdAt: new Date(),
        verificationStatus: "pending",
      });

      navigate(`/register/${role}/step2`);
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
        {/* FIX: Explicitly navigate to Home */}
        <button className="back-button" onClick={() => navigate("/")}>
          ◀ Back
        </button>
        <div>
          <div className="header-title">Register</div>
          <div className="header-subtitle">{displayRole}</div>
        </div>
        <span />
      </div>

      <div className="content">
        <StepBar currentStep={currentStep} completedSteps={completedSteps} />

        <div className="glass-card">
          <div className="field-label">Full Name <span style={{color:'red'}}>*</span></div>
          <input
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />

          <div className="field-label">Phone <span style={{color:'red'}}>*</span></div>
          <input
            className="input"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />

          <div className="field-label">Password <span style={{color:'red'}}>*</span></div>
          <input
            className="input"
            type="password"
            required
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
          />

          {error && <div style={{ color: "red", fontSize: 12, marginTop: 4 }}>{error}</div>}

          <button
            className="btn-primary"
            onClick={handleNext}
            disabled={busy}
            style={{ marginTop: 8 }}
          >
            {busy ? "Creating account..." : "Next"}
          </button>

          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280", textAlign: "center" }}>
            Already have an account? <a href="/login" style={{ color: "#2563eb", textDecoration: "none" }}>Log in</a>
          </div>
        </div>
      </div>

      <div className="footer-note">Step 1 of 2 • Passwords stored securely with Firebase Auth</div>
    </div>
  );
}