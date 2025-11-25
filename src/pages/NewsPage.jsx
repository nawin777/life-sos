import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import BottomNav from "../components/BottomNav";

export default function NewsPage() {
  const user = auth.currentUser;
  const [role, setRole] = useState("normal");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const refUser = doc(db, "users", user.uid);
      const snap = await getDoc(refUser);
      const data = snap.exists() ? snap.data() : {};
      setRole(data.role || "normal");
    };
    load();
  }, [user]);

  return (
    <div className="view">
      <div className="header">
        <span />
        <div>
          <div className="header-title">Safety News</div>
          <div className="header-subtitle">
            Updates, tips & campus alerts
          </div>
        </div>
        <span />
      </div>

      <div className="content">
        <div className="glass-card">
          <div className="field-label">Today</div>
          <div className="list-card">
            <div className="list-card-title">
              Safety awareness session scheduled
            </div>
            <div className="list-card-sub">
              Example placeholder news. Later you can fetch from Firestore or an API.
            </div>
          </div>

          <div className="list-card">
            <div className="list-card-title">
              Emergency helpline numbers updated
            </div>
            <div className="list-card-sub">
              Keep your contact list refreshed with verified helplines.
            </div>
          </div>
        </div>
      </div>

      <BottomNav role={role} />
    </div>
  );
}
