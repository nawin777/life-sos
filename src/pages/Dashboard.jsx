import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  limit,
} from "firebase/firestore";

import SplashScreen from "../components/SplashScreen";
import BottomNav from "../components/BottomNav";

// Haversine Distance Helper
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
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper to create SOS
async function createSosAndGroupUsingLastKnownLocation({ kind, victimId, victimName }) {
  const POLICE_UID = "DFLl5C29omPE2nAtQuQcq9yaMpR2"; 
  const userRef = doc(db, "users", victimId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("User profile not found.");
  
  const userData = userSnap.data();
  const loc = userData?.lastKnownLocation;
  
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    throw new Error("No location found. Please enable location services.");
  }

  const sosRef = await addDoc(collection(db, "sosRequests"), {
    type: kind,
    victimId,
    victimName,
    location: { lat: loc.lat, lng: loc.lng },
    status: "open",
    createdAt: serverTimestamp(),
  });

  const groupRef = await addDoc(collection(db, "groups"), {
    title: `${kind === "medical" ? "Medical" : "Emergency"} - ${victimName}`,
    members: [POLICE_UID], 
    victimId: victimId,
    sosRequestId: sosRef.id,
    createdAt: serverTimestamp(),
    location: { lat: loc.lat, lng: loc.lng }
  });

  await updateDoc(doc(db, "sosRequests", sosRef.id), { groupId: groupRef.id });
  return { sosId: sosRef.id, groupId: groupRef.id };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Local State
  const [role, setRole] = useState("normal");
  const [name, setName] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [userLocation, setUserLocation] = useState(null); 

  const [nearbyCount, setNearbyCount] = useState(0); 

  const [profileLoading, setProfileLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState("checking");
  const [locationError, setLocationError] = useState("");
  const [userDocRef, setUserDocRef] = useState(null);

  const [sosMode, setSosMode] = useState("safety"); 
  const [activeSession, setActiveSession] = useState(null);
  const activeSessionUnsub = useRef(null);
  const [countdown, setCountdown] = useState(null);

  // 1. Load profile & Location
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const init = async () => {
      try {
        const refUser = doc(db, "users", user.uid);
        setUserDocRef(refUser);

        const snap = await getDoc(refUser);
        const data = snap.exists() ? snap.data() : {};

        if (!mounted) return;

        setRole(data.role || "normal");
        setName(data.name || "");
        setVerificationStatus(data.verificationStatus || "pending");

        if (data.lastKnownLocation) {
          setLocationStatus("already-set");
          setUserLocation(data.lastKnownLocation);
        } else {
          requestLocation(refUser);
        }

        // Check for active SOS session
        const q = query(
          collection(db, "sosRequests"),
          where("victimId", "==", user.uid),
          where("status", "in", ["open", "in-progress"])
        );
        
        const unsub = onSnapshot(q, (snap) => {
          if (!mounted) return;
          if (snap.empty) {
            if (activeSessionUnsub.current) {
              activeSessionUnsub.current();
              activeSessionUnsub.current = null;
            }
            setActiveSession(null);
            return;
          }
          
          const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
          docs.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          const newest = docs[0];

          const sref = doc(db, "sosRequests", newest.id);
          if (activeSessionUnsub.current) activeSessionUnsub.current();
          
          activeSessionUnsub.current = onSnapshot(sref, (d) => {
            if (!d.exists()) { setActiveSession(null); return; }
            setActiveSession({ id: d.id, ...d.data() });
          });
        });

        setProfileLoading(false);
        return () => unsub();
      } catch (e) {
        console.error("Error loading profile", e);
        setProfileLoading(false);
        setLocationStatus("error");
      }
    };
    init();
    return () => { mounted = false; if (activeSessionUnsub.current) activeSessionUnsub.current(); };
  }, [user]);

  // 2. LISTEN FOR NEARBY REQUESTS
  useEffect(() => {
    if (!user || !userLocation) return; 

    const q = query(collection(db, "sosRequests"), limit(50));

    const unsub = onSnapshot(q, (snap) => {
        let count = 0;
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status !== 'open' && data.status !== 'in-progress') return;
            if (data.victimId === user.uid) return; 
            
            if (data.location && userLocation) {
                const dist = distanceKm(userLocation.lat, userLocation.lng, data.location.lat, data.location.lng);
                if (dist <= 2) {
                    count++;
                }
            }
        });
        setNearbyCount(count);
    });

    return () => unsub();
  }, [user, userLocation]);


  // Helper Functions
  const requestLocation = (existingRef) => {
    if (!user) return;
    if (!navigator.geolocation) { setLocationStatus("error"); return; }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const locPayload = { lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAt: new Date() };
        try {
          await updateDoc(existingRef || doc(db, "users", user.uid), { lastKnownLocation: locPayload });
          setUserLocation(locPayload); 
          setLocationStatus("saved");
        } catch (e) { setLocationStatus("error"); }
      },
      () => { setLocationStatus("error"); setLocationError("Location permission required."); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const sendSOS = async () => {
    if (!auth.currentUser) return;
    const kind = sosMode === "medical" ? "medical" : "emergency";
    const victimId = auth.currentUser.uid;
    setActiveSession({ id: "temp", type: kind, status: "initiating", victimName: name || "You", createdAt: { toDate: () => new Date() }, location: { lat: 0, lng: 0 }, responders: [] });

    try {
      let victimName = name; 
      if (!victimName) {
        const uSnap = await getDoc(doc(db, "users", victimId));
        if (uSnap.exists()) victimName = uSnap.data()?.name || "";
      }
      await createSosAndGroupUsingLastKnownLocation({ kind, victimId, victimName });
    } catch (err) {
      console.error("SOS error:", err);
      setActiveSession(null);
      alert(err.message || "Could not create SOS.");
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timerId = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (countdown === 0) {
      setCountdown(null);
      sendSOS();
    }
  }, [countdown]);

  const handleStartSOS = () => setCountdown(5);
  const handleCancelSOS = () => setCountdown(null);

  if (!user) return <Navigate to="/" replace />;
  if (profileLoading) return <SplashScreen />;

  const isMedical = sosMode === "medical";
  
  // Updated Styles for the Plain Rectangular Card
  const customStyles = `
    @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7); } 70% { box-shadow: 0 0 0 20px rgba(255, 82, 82, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 82, 82, 0); } }
    @keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7); } 70% { box-shadow: 0 0 0 20px rgba(66, 133, 244, 0); } 100% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0); } }
    .pulsing-btn { animation: ${isMedical ? 'pulse-blue' : 'pulse-red'} 1.5s infinite; }
    
    .active-sos-card {
      width: 90%;
      max-width: 340px;
      padding: 30px 20px;
      border-radius: 20px;
      background: ${isMedical ? 'linear-gradient(135deg, #3b82f6, #1e40af)' : 'linear-gradient(135deg, #ef4444, #991b1b)'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
      box-shadow: 0 10px 25px ${isMedical ? 'rgba(37,99,235,0.5)' : 'rgba(220,38,38,0.5)'};
      margin-top: 40px;
    }
  `;

  return (
    <div className="view">
      <style>{customStyles}</style>

      {/* TOP BAR */}
      <div className="header">
        <div className="header-icons left">
          <i className="fas fa-bullhorn header-icon" onClick={() => navigate("/news")} />
        </div>
        <div className="header-title-center">
          <div className="header-title-center-text">
            {role === "helper" ? "Helper Dashboard" : role === "police" ? "Police Dashboard" : "Dashboard"}
          </div>
          <div className="header-title-center-sub">{name ? `Welcome, ${name}` : "Welcome"}</div>
        </div>
        <div className="header-icons right">
          <i className="fas fa-user-circle header-icon" onClick={() => navigate("/profile")} />
        </div>
      </div>

      {/* CENTER CONTENT */}
      <div className="content dashboard-center">
        <div className="sos-mode-bar">
          <button className={"sos-mode-chip " + (!isMedical ? "active safety" : "safety")} onClick={() => setSosMode("safety")} disabled={countdown !== null || activeSession}>Safety</button>
          <button className={"sos-mode-chip " + (isMedical ? "active medical" : "medical")} onClick={() => setSosMode("medical")} disabled={countdown !== null || activeSession}>Medical</button>
        </div>

        {activeSession ? (
          /* PLAIN RECTANGULAR ACTIVE CARD - NO BUTTONS */
          <div className="active-sos-card">
            <i className="fas fa-tower-broadcast" style={{fontSize: 40, marginBottom: 15}}></i>
            <div style={{fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1}}>
              Emergency
              <br/>
              Active
            </div>
            <div style={{fontSize: 11, opacity: 0.8, marginTop: 8}}>
              Help is being alerted.
            </div>
          </div>
        ) : countdown !== null ? (
          /* COUNTDOWN CIRCLE */
          <div className="sos-main-wrap">
            <div className="sos-main-circle-outer pulsing-btn" onClick={handleCancelSOS} role="button">
              <div className={"sos-main-circle-inner " + (isMedical ? "blue" : "red")}>
                <div className="sos-main-top-row"><i className="fas fa-hand-paper" style={{ fontSize: 28 }} /></div>
                <div className="sos-main-text-top">SENDING SOS IN</div>
                <div className="sos-main-text-center" style={{ fontSize: "4rem" }}>{countdown}</div>
                <div className="sos-main-text-bottom">Tap to <strong>STOP</strong></div>
              </div>
            </div>
          </div>
        ) : (
          /* START BUTTON */
          <div className="sos-main-wrap">
            <div className="sos-main-circle-outer" onClick={handleStartSOS} role="button">
              <div className={"sos-main-circle-inner " + (isMedical ? "blue" : "red")}>
                <div className="sos-main-top-row"><i className={"fas " + (isMedical ? "fa-heart-pulse" : "fa-triangle-exclamation")} style={{ fontSize: 28 }} /></div>
                <div className="sos-main-text-top">{isMedical ? "MEDICAL" : "SAFETY"}</div>
                <div className="sos-main-text-center">SOS</div>
                <div className="sos-main-text-bottom">{isMedical ? "Tap for medical emergency" : "Tap for safety emergency"}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="footer-note">Role: {role} • Verification: {verificationStatus}</div>
      <BottomNav role={role} nearbyCount={nearbyCount} />
      
      {locationStatus === "error" && (
        <div className="location-overlay">
          <div className="location-dialog">
            <div className="location-dialog-title">Location Required</div>
            <div className="location-dialog-text">{/*locationError || */"Please login through the website once and grant location access"}</div>
            <button className="btn-primary" onClick={() => requestLocation(userDocRef)}>Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
}