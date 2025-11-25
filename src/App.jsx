import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";

import SplashScreen from "./components/SplashScreen";
import RoleSelection from "./pages/RoleSelection";
import RegisterStep1 from "./pages/RegisterStep1";
import RegisterStep2 from "./pages/RegisterStep2";
import Dashboard from "./pages/Dashboard";
import NewsPage from "./pages/NewsPage";
import ProfilePage from "./pages/ProfilePage";
import NearbyPage from "./pages/NearbyPage";
import LoginPage from "./pages/LoginPage";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

/* ---------- GLOBAL SOS POPUP (helpers/police) ---------- */

// Haversine distance in km
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function GlobalSosPopup({ user }) {
  const [role, setRole] = useState("normal");
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [helperLocation, setHelperLocation] = useState(null);
  const [popupRequest, setPopupRequest] = useState(null);

  const navigate = useNavigate();

  // Load profile (role, verificationStatus, lastKnownLocation)
  useEffect(() => {
    if (!user) {
      setPopupRequest(null);
      return;
    }

    const load = async () => {
      try {
        const refUser = doc(db, "users", user.uid);
        const snap = await getDoc(refUser);
        if (!snap.exists()) return;
        const data = snap.data();
        setRole(data.role || "normal");
        setVerificationStatus(data.verificationStatus || "pending");
        if (data.lastKnownLocation) {
          setHelperLocation({
            lat: data.lastKnownLocation.lat,
            lng: data.lastKnownLocation.lng,
          });
        }
      } catch (e) {
        console.error("Error loading profile for global popup", e);
      }
    };

    load();
  }, [user]);

  // Listen to open SOS requests and pick nearest within 2 km
  useEffect(() => {
    if (!user) return;
    const isHelperLike = role === "helper" || role === "police";
    if (!isHelperLike) return;
    if (verificationStatus !== "approved") return;
    if (!helperLocation) return;

    const q = query(
      collection(db, "sosRequests"),
      where("status", "==", "open")
    );

    const unsub = onSnapshot(q, (snap) => {
      let nearest = null;
      let nearestDist = null;

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.location) return;
        const d = distanceKm(
          helperLocation.lat,
          helperLocation.lng,
          data.location.lat,
          data.location.lng
        );
        if (d <= 2) {
          if (nearestDist === null || d < nearestDist) {
            nearestDist = d;
            nearest = { id: docSnap.id, ...data, distanceKm: d };
          }
        }
      });

      setPopupRequest(nearest);
    });

    return () => unsub();
  }, [user, role, verificationStatus, helperLocation]);

  const handleAccept = async () => {
    if (!popupRequest) return;
    try {
      await updateDoc(doc(db, "sosRequests", popupRequest.id), {
        status: "in-progress",
      });
    } catch (e) {
      console.error("Error marking request in-progress", e);
    }
    setPopupRequest(null);
    navigate("/nearby");
  };

  const handleCancel = () => {
    setPopupRequest(null);
  };

  if (!popupRequest) return null;

  const labelType =
    popupRequest.type === "medical" ? "medical emergency" : "emergency";

  return (
    <div className="location-overlay">
      <div className="location-dialog">
        <div className="location-dialog-title">Help needed</div>
        <div className="location-dialog-text">
          A {labelType} has been triggered near you (
          {popupRequest.distanceKm.toFixed(2)} km away) by{" "}
          {popupRequest.victimName || "a user"}. Do you want to join the
          response group?
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={handleAccept}
          >
            Accept
          </button>
          <button
            className="btn-secondary"
            style={{ flex: 1 }}
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- MAIN APP ---------- */

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [timerDone, setTimerDone] = useState(false);

  // 🔹 Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // 🔹 3-second forced wait
  useEffect(() => {
    const t = setTimeout(() => setTimerDone(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // 🔹 Only proceed when BOTH are complete
  if (!authChecked || !timerDone) {
    return <SplashScreen />;
  }


  return (
    <Router>
      {user && <GlobalSosPopup user={user} />}

      <Routes>
        {/* Home: if logged in → dashboard, else role selection (register) */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" /> : <RoleSelection />}
        />

        {/* Registration stays accessible even after login to avoid flicker, Step2 self-guards */}
        <Route path="/register/:role/step1" element={<RegisterStep1 />} />
        <Route path="/register/:role/step2" element={<RegisterStep2 />} />

        {/* Login page: redirect away if already logged in */}
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
        />

        {/* Auth-only pages */}
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/news"
          element={user ? <NewsPage /> : <Navigate to="/" />}
        />
        <Route
          path="/nearby"
          element={user ? <NearbyPage /> : <Navigate to="/" />}
        />
        <Route
          path="/profile"
          element={user ? <ProfilePage /> : <Navigate to="/" />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
