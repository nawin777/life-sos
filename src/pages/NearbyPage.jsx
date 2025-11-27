import { useEffect, useState } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  updateDoc,
  addDoc,
  serverTimestamp,
  arrayUnion,
  limit
} from "firebase/firestore";
import BottomNav from "../components/BottomNav";

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

const POLICE_UID = "Ld5B0lpl68NbOQ8MG5h3Dl3vhzo2";

export default function NearbyPage() {
  const navigate = useNavigate();
  const location = useLocation(); 
  const user = auth.currentUser;

  const highlightId = location.state?.highlightId;

  const [role, setRole] = useState("normal");
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [helperLocation, setHelperLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  // 1. Load Profile
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const refUser = doc(db, "users", user.uid);
        const snap = await getDoc(refUser);
        if (snap.exists()) {
          const data = snap.data();
          setRole(data.role || "normal");
          setVerificationStatus(data.verificationStatus || "pending");
          if (data.lastKnownLocation?.lat && data.lastKnownLocation?.lng) {
            setHelperLocation({
              lat: data.lastKnownLocation.lat,
              lng: data.lastKnownLocation.lng,
            });
          }
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const isHelperLike = role === "helper" || role === "police";
  const isVerifiedHelper = isHelperLike && verificationStatus === "approved";
  // Helper boolean for view logic
  const isPoliceUser = role === 'police';

  // 2. Listen for SOS requests
  useEffect(() => {
    if (!user || !isVerifiedHelper || !helperLocation) return;

    const q = query(collection(db, "sosRequests"), limit(50));

    const unsub = onSnapshot(q, (snap) => {
        const list = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data || !data.location) return;
          
          if (data.status === 'closed' || data.status === 'cancelled') return;
          if (data.victimId === user.uid) return;

          const lat = Number(data.location.lat);
          const lng = Number(data.location.lng);
          if (!isFinite(lat) || !isFinite(lng)) return;

          const dist = distanceKm(helperLocation.lat, helperLocation.lng, lat, lng);
          const amIResponder = data.responders && data.responders.includes(user.uid);

          if (dist <= 2 || amIResponder) {
            list.push({
              id: docSnap.id,
              ...data,
              distanceKm: dist,
              amIResponder: amIResponder,
            });
          }
        });

        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return tb - ta;
        });

        setNearbyRequests(list);
      },
      (err) => console.error("onSnapshot error:", err)
    );

    return () => unsub();
  }, [user, isVerifiedHelper, helperLocation]);

  // 3. Scroll Highlight
  useEffect(() => {
    if (highlightId && nearbyRequests.length > 0) {
      const el = document.getElementById(`card-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightId, nearbyRequests]);


  if (!user) return <Navigate to="/" />;
  if (loading) return <div className="view"><div className="content"></div></div>;
  if (!isHelperLike) return <Navigate to="/dashboard" />;

  // 4. Accept Handler
  const handleAccept = async (req) => {
    if (!req || !user) return;
    
    // Optimistic UI
    setShowHelpPopup(false);
    setNearbyRequests((prev) => 
      prev.map((r) => r.id === req.id ? { ...r, amIResponder: true } : r)
    );

    try {
      let groupId = req.groupId;
      const sosRef = doc(db, "sosRequests", req.id);
      
      if (groupId) {
        // Group exists, just join
        const gRef = doc(db, "groups", groupId);
        await updateDoc(gRef, { members: arrayUnion(user.uid) });
      } else {
        // Create new group
        // PRIVACY: Random code for group title
        const randomCode = req.id.slice(0, 6).toUpperCase(); 
        
        const groupDocRef = await addDoc(collection(db, "groups"), {
          title: `Emergency Group #${randomCode}`, 
          // PRIVACY: Victim NOT in members. Only Police + Responder.
          members: [POLICE_UID, user.uid],
          victimId: req.victimId, // Reference ID only
          sosRequestId: req.id,
          createdAt: serverTimestamp(),
          location: req.location 
        });
        groupId = groupDocRef.id;
      }

      await updateDoc(sosRef, { 
          status: "in-progress",
          groupId: groupId,
          responders: arrayUnion(user.uid) 
      });

      setTimeout(() => {
          navigate(`/group/${groupId}`);
      }, 500);

    } catch (e) {
      console.error("Error accepting request", e);
      alert("Could not accept request.");
    }
  };

  const handleCancel = () => {
    setShowHelpPopup(false);
    setSelectedRequest(null);
  };

  const handleCardAction = (req) => {
    if (req.amIResponder) {
        navigate(`/group/${req.groupId}`);
    } else {
        setSelectedRequest(req);
        setShowHelpPopup(true);
    }
  };

  return (
    <>
      <div className="view">
        <div className="header">
          <span />
          <div>
            <div className="header-title">Nearby Requests</div>
            <div className="header-subtitle">Helpers & police see nearby SOS</div>
          </div>
          <span />
        </div>

        <div className="content">
          {!isVerifiedHelper ? (
            <div className="glass-card">
              <div className="field-label">Helper Access Locked</div>
              <div className="list-card">
                <div className="list-card-title">Profile not verified</div>
              </div>
            </div>
          ) : (
            <div className="glass-card">
              <div className="field-label">Nearby Alerts</div>

              {nearbyRequests.length === 0 ? (
                <div className="list-card">
                  <div className="list-card-title">No active requests.</div>
                </div>
              ) : (
                nearbyRequests.map((req) => {
                  const isHighlighted = (req.id === highlightId) && !req.amIResponder;
                  
                  // PRIVACY LOGIC FOR CARD
                  const displayName = isPoliceUser ? (req.victimName || "Unknown") : "Citizen in Distress";
                  const displayDist = isPoliceUser ? `${req.distanceKm.toFixed(2)} km` : "Within 2 km";

                  return (
                    <div
                      key={req.id}
                      id={`card-${req.id}`}
                      className={`list-card ${req.amIResponder ? 'accepted-card' : ''}`}
                      style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center",
                          borderLeft: req.amIResponder ? "4px solid #4CAF50" : "none",
                          boxShadow: isHighlighted ? "0 0 15px rgba(255, 193, 7, 0.6)" : "none",
                          border: isHighlighted ? "1px solid rgba(255, 193, 7, 0.8)" : "1px solid rgba(255,255,255,0.1)",
                          transition: "all 0.3s ease"
                      }}
                    >
                      <div>
                        <div className="list-card-title">
                          {req.type === "medical" ? "Medical Alert" : "Emergency Alert"}
                        </div>
                        <div className="list-card-sub" style={{marginTop: 4}}>
                            <div style={{fontWeight: 600, color: '#e11d48'}}>
                                <i className="fas fa-user-secret"></i> {displayName}
                            </div>
                            <div>
                                <i className="fas fa-map-marker-alt"></i> {displayDist}
                            </div>
                        </div>
                      </div>

                      <div>
                        <button 
                          className={req.amIResponder ? "btn-primary" : "btn-primary-outline"} 
                          style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          onClick={() => handleCardAction(req)}
                        >
                          {req.amIResponder ? "Chat" : "View"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <BottomNav role={role} nearbyCount={nearbyRequests.length} />
      </div>

      {/* POPUP - Also uses Privacy Logic */}
      {showHelpPopup && selectedRequest && isVerifiedHelper && (
        <div className="location-overlay">
          <div className="location-dialog">
            <div className="location-dialog-title">
                {selectedRequest.type === "medical" ? "Medical Emergency" : "SOS Alert"}
            </div>
            
            <div className="location-dialog-text">
              <strong>{isPoliceUser ? selectedRequest.victimName : "Anonymous User"}</strong> needs help!
              <br/>
              Location: <strong>{isPoliceUser ? `${selectedRequest.distanceKm.toFixed(2)} km away` : "Within 2 km range"}</strong>
              <br/><br/>
              Clicking accept will add you to the response group with Police.
            </div>
            
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleAccept(selectedRequest)}>
                ACCEPT & JOIN
              </button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={handleCancel}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}