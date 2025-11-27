import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
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

export default function NearbyPage() {
  const user = auth.currentUser;
  const [role, setRole] = useState("normal");
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [helperLocation, setHelperLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [acceptedRequest, setAcceptedRequest] = useState(null);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const refUser = doc(db, "users", user.uid);
      const snap = await getDoc(refUser);
      if (snap.exists()) {
        const data = snap.data();
        setRole(data.role || "normal");
        setVerificationStatus(data.verificationStatus || "pending");
        if (data.lastKnownLocation) {
          setHelperLocation({
            lat: data.lastKnownLocation.lat,
            lng: data.lastKnownLocation.lng,
          });
        }
      }
      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const isHelperLike = role === "helper" || role === "police";
  const isVerifiedHelper = isHelperLike && verificationStatus === "approved";

  // Listen for SOS requests within 2km
  useEffect(() => {
    if (!user || !isVerifiedHelper || !helperLocation) return;

    const q = query(
      collection(db, "sosRequests"),
      where("status", "==", "open")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.location) return;
        const dist = distanceKm(
          helperLocation.lat,
          helperLocation.lng,
          data.location.lat,
          data.location.lng
        );
        if (dist <= 2) {
          list.push({
            id: docSnap.id,
            ...data,
            distanceKm: dist,
          });
        }
      });
      setNearbyRequests(list);

      if (list.length > 0) {
        setSelectedRequest(list[0]);
        setShowHelpPopup(true);
      } else {
        setShowHelpPopup(false);
        setSelectedRequest(null);
      }
    });

    return () => unsub();
  }, [user, isVerifiedHelper, helperLocation]);

  if (!user) return <Navigate to="/" />;

  if (loading) {
    return (
      <div className="view">
        <div className="content">Loading…</div>
      </div>
    );
  }

  if (!isHelperLike) {
    return <Navigate to="/dashboard" />;
  }

  const handleAccept = async () => {
    if (!selectedRequest) return;
    try {
      await updateDoc(doc(db, "sosRequests", selectedRequest.id), {
        status: "in-progress",
      });
      setAcceptedRequest(selectedRequest);
      setShowHelpPopup(false);
    } catch (e) {
      console.error("Error accepting request", e);
      alert("Could not accept request. Try again.");
    }
  };

  const handleCancel = () => {
    setShowHelpPopup(false);
  };

  return (
    <>
      <div className="view">
        <div className="header">
          <span />
          <div>
            <div className="header-title">Nearby Requests</div>
            <div className="header-subtitle">
              Helpers & police see nearby SOS
            </div>
          </div>
          <span />
        </div>

        <div className="content">
          {!isVerifiedHelper ? (
            <div className="glass-card">
              <div className="field-label">Helper Access Locked</div>
              <div className="list-card">
                <div className="list-card-title">
                  Your profile is not yet verified.
                </div>
                <div className="list-card-sub">
                  Admin must approve your verification before you can view
                  nearby requests. Please wait for admin review.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="glass-card">
                <div className="field-label">Nearby within 2 km</div>
                {nearbyRequests.length === 0 ? (
                  <div className="list-card">
                    <div className="list-card-title">
                      No active requests nearby.
                    </div>
                    <div className="list-card-sub">
                      When someone triggers SOS near you, it will appear here.
                    </div>
                  </div>
                ) : (
                  nearbyRequests.map((req) => (
                    <div key={req.id} className="list-card">
                      <div className="list-card-title">
                        {req.type === "medical"
                          ? "Medical Emergency"
                          : "Emergency"}{" "}
                        • {req.distanceKm.toFixed(2)} km away
                      </div>
                      <div className="list-card-sub">
                        From: {req.victimName || "Unknown"} • Tap popup to
                        respond.
                      </div>
                    </div>
                  ))
                )}
              </div>

              {acceptedRequest && (
                <div className="glass-card" style={{ marginTop: 12 }}>
                  <div className="field-label">
                    Group Chat •{" "}
                    {acceptedRequest.type === "medical"
                      ? "Medical"
                      : "Emergency"}{" "}
                    SOS
                  </div>
                  <div className="chat-box">
                    <div className="chat-msg other">
                      <span className="bubble">
                        <span className="sender">System:</span> Connected to
                        victim & other responders. (Prototype chat)
                      </span>
                    </div>
                  </div>
                  <div className="chat-input-row">
                    <input
                      className="input chat-input"
                      placeholder="Type a message (UI only)…"
                    />
                    <button className="chat-send-btn">Send</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <BottomNav role={role} nearbyCount={nearbyRequests.length} />
      </div>

      {/* Help needed popup */}
      {showHelpPopup && selectedRequest && isVerifiedHelper && (
        <div className="location-overlay">
          <div className="location-dialog">
            <div className="location-dialog-title">Help needed</div>
            <div className="location-dialog-text">
              A{" "}
              {selectedRequest.type === "medical"
                ? "medical emergency"
                : "general emergency"}{" "}
              has been triggered near you (
              {selectedRequest.distanceKm.toFixed(2)} km away) by{" "}
              {selectedRequest.victimName || "a user"}. Do you want to join
              the response group?
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
      )}
    </>
  );
}
