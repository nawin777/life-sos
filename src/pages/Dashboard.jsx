// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import BottomNav from "../components/BottomNav";
import SplashScreen from "../components/SplashScreen";

export default function Dashboard() {
  const navigate = useNavigate();

  const [role, setRole] = useState("normal");
  const [name, setName] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("pending");

  const [locationStatus, setLocationStatus] = useState("checking");
  const [locationError, setLocationError] = useState("");
  const [userDocRef, setUserDocRef] = useState(null);

  const [profileLoading, setProfileLoading] = useState(true);

  // "safety" or "medical"
  const [sosMode, setSosMode] = useState("safety");

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        const refUser = doc(db, "users", user.uid);
        setUserDocRef(refUser);

        const snap = await getDoc(refUser);
        const data = snap.exists() ? snap.data() : {};

        setRole(data.role || "normal");
        setName(data.name || "");
        setVerificationStatus(data.verificationStatus || "pending");

        if (data.lastKnownLocation) {
          setLocationStatus("already-set");
        } else {
          requestLocation(refUser);
        }
      } catch (e) {
        console.error("Error loading user profile", e);
        setLocationStatus("error");
        setLocationError("Could not load profile.");
      } finally {
        setProfileLoading(false);
      }
    };

    init();
  }, [user]);

  const requestLocation = (existingRef) => {
    if (!user) return;

    const refUser = existingRef || doc(db, "users", user.uid);

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Device does not support location.");
      return;
    }

    console.log("Requesting geolocation...");
    setLocationStatus("requesting");
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        console.log("Geolocation success", pos);
        const { latitude, longitude } = pos.coords;
        try {
          await updateDoc(refUser, {
            lastKnownLocation: {
              lat: latitude,
              lng: longitude,
              updatedAt: new Date(),
            },
          });
          setLocationStatus("saved");
        } catch (e) {
          console.error("Error saving location", e);
          setLocationStatus("error");
          setLocationError("Could not save location. Please try again.");
        }
      },
      (err) => {
        console.error("Geolocation error", err);
        setLocationStatus("error");
        setLocationError(
          "Location permission is required. Please turn on GPS & allow location."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  // Map UI mode → Firestore type (keep "emergency" for compatibility)
  const triggerSOS = async () => {
    const kind = sosMode === "medical" ? "medical" : "emergency";

    try {
      if (!user || !userDocRef) return;
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        alert("Profile not loaded. Please reload the app.");
        return;
      }
      const data = snap.data();
      const loc = data.lastKnownLocation;
      if (!loc) {
        alert("Location not available yet. Please allow location first.");
        requestLocation(userDocRef);
        return;
      }

      await addDoc(collection(db, "sosRequests"), {
        type: kind,
        victimId: user.uid,
        victimName: data.name || "",
        victimRole: data.role || "normal",
        location: {
          lat: loc.lat,
          lng: loc.lng,
        },
        status: "open",
        createdAt: serverTimestamp(),
      });

      alert(
        kind === "medical"
          ? "Medical emergency alert sent to nearby helpers."
          : "Safety emergency alert sent to nearby helpers."
      );
    } catch (e) {
      console.error("Error creating SOS request", e);
      alert("Could not create SOS request. Please try again.");
    }
  };

  // If not logged in at all → never show dashboard
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // While profile (name, role, etc.) is loading, show Splash
  if (profileLoading) {
    return <SplashScreen />;
  }

  const isMedical = sosMode === "medical";

  return (
    <>
      <div className="view">
        {/* TOP BAR */}
        <div className="header">
          {/* Left: Loudspeaker → News */}
          <div className="header-icons">
  <i
    className="fas fa-bullhorn header-icon"
    title="Announcements"
    onClick={() => navigate("/news")}
  ></i>
</div>

          {/* Center: Title + subtitle */}
          <div className="header-title-center">
            <div className="header-title-center-text">
              {role === "helper"
                ? "Helper Dashboard"
                : role === "police"
                ? "Police Dashboard"
                : "Dashboard"}
            </div>
            <div className="header-title-center-sub">
              {name ? `Welcome, ${name}` : "Welcome"}
            </div>
          </div>

          {/* Right: Bell, Help, Profile */}
          <div className="header-icons">
  <i
    className="fas fa-bell header-icon"
    title="Notifications"
    onClick={() => alert("Notifications coming soon")}
  ></i>

  <i
    className="fas fa-question-circle header-icon"
    title="Help"
    onClick={() => alert("Help / FAQ coming soon")}
  ></i>

  <i
    className="fas fa-user-circle header-icon"
    title="Your Profile"
    onClick={() => navigate("/profile")}
  ></i>
</div>
        </div>

        <div className="content dashboard-center">
          {/* MODE BAR: Safety vs Medical */}
          <div className="sos-mode-bar">
            <button
              className={
                "sos-mode-chip " + (!isMedical ? "active safety" : "safety")
              }
              onClick={() => setSosMode("safety")}
            >
              Safety Emergency
            </button>
            <button
              className={
                "sos-mode-chip " + (isMedical ? "active medical" : "medical")
              }
              onClick={() => setSosMode("medical")}
            >
              Medical Emergency
            </button>
          </div>

          {/* MAIN SOS BUTTON */}
          <div className="sos-main-wrap">
            <div className="sos-main-circle-outer" onClick={triggerSOS}>
              <div
                className={
                  "sos-main-circle-inner " +
                  (isMedical ? "blue" : "red")
                }
              >
                <div className="sos-main-text-top">
                  {isMedical ? "MEDICAL" : "SAFETY"}
                </div>
                <div className="sos-main-text-center">SOS</div>
                <div className="sos-main-text-bottom">
                  {isMedical ? "Tap to alert for medical emergency" : "Tap to alert for safety emergency"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <BottomNav role={role} />
      </div>

      {/* Blocking dialog if location not granted or failed */}
      {locationStatus === "error" && (
        <div className="location-overlay">
          <div className="location-dialog">
            <div className="location-dialog-title">Location Required</div>
            <div className="location-dialog-text">
              To use Life-SOS, we need your location to send or receive
              help accurately. Please enable GPS and allow location access
              in your browser or device settings, then try again.
            </div>
            <button
              className="btn-primary"
              onClick={() => requestLocation(userDocRef)}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
