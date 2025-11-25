import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import BottomNav from "../components/BottomNav";

export default function ProfilePage() {
  const user = auth.currentUser;
  const navigate = useNavigate();

  const [role, setRole] = useState("normal");
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const refUser = doc(db, "users", user.uid);
      const snap = await getDoc(refUser);
      if (snap.exists()) {
        const data = snap.data();
        setRole(data.role || "normal");
        setVerificationStatus(data.verificationStatus || "pending");
        setName(data.name || "");
        setPhone(data.phone || "");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const refUser = doc(db, "users", user.uid);
    await updateDoc(refUser, { name, phone });
    alert("Profile updated");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="view">
        <div className="content">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ◀ Back
        </button>
        <div>
          <div className="header-title">Your Profile</div>
          <div className="header-subtitle">
            Role: {role} • Verification: {verificationStatus}
          </div>
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
          />

          <div className="field-label">Phone</div>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="field-label">Role</div>
          <div className="list-card" style={{ marginBottom: 12 }}>
            <div className="list-card-title" style={{ textTransform: "capitalize" }}>
              {role}
            </div>
            <div className="list-card-sub">
              Role changes require admin action.
            </div>
          </div>

          <button className="btn-primary" onClick={handleSave}>
            Save
          </button>
          <button
            className="btn-secondary"
            style={{ marginTop: 10 }}
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </div>

      <BottomNav role={role} />
    </div>
  );
}
