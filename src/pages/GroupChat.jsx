import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db, storage } from "../firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  arrayRemove,
  arrayUnion
} from "firebase/firestore";
import { ref as sref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const POLICE_UID_FALLBACK = "enOy7o3BsmZQTVfCfGPUAd5D7Pj1"; 
const GOOGLE_MAPS_API_KEY = "";

export default function GroupChat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Data State
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [membersInfo, setMembersInfo] = useState([]);
  const [victimProfile, setVictimProfile] = useState(null);
  
  // UI State
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [instructionText, setInstructionText] = useState("");
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [sendToPoliceOnly, setSendToPoliceOnly] = useState(false); 

  // Modal State
  const [showMembers, setShowMembers] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeStatement, setCloseStatement] = useState("");

  // Private Order State
  const [privateOrderTarget, setPrivateOrderTarget] = useState(null); 
  const [privateOrderText, setPrivateOrderText] = useState("");

  const fileRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 1. Load Group
  useEffect(() => {
    if (!groupId) return;
    const unsub = onSnapshot(doc(db, "groups", groupId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        
        if (data.status === 'closed') {
            alert("Case closed.");
            navigate("/dashboard");
            return;
        }
        
        const isMember = data.members && data.members.includes(user.uid);
        // Robust check for victim access
        const targetVictimId = data.victimId || (data.members && data.members[0]);
        const isVictimRef = targetVictimId === user.uid;

        if (!isMember && !isVictimRef) {
            alert("Access denied.");
            navigate("/dashboard");
            return;
        }

        setGroup(data);
        if (data.instructions && !isEditingInstructions) setInstructionText(data.instructions);
      } else navigate("/dashboard");
    });
    return () => unsub();
  }, [groupId, navigate, isEditingInstructions, user]);

  // 2. Load Messages
  useEffect(() => {
    if (!groupId) return;
    const q = query(collection(db, "groups", groupId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setMessages(arr);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
  }, [groupId]);

  // 3. Load Members & Victim Profile (FIXED TO ENSURE PROFILE LOADS)
  useEffect(() => {
    if (!group) return;

    // Determine Victim ID robustly
    const targetVictimId = group.victimId || (group.members && group.members[0]);

    // A. Fetch Members (Exclude Victim)
    if (group.members) {
        Promise.all(group.members.map(async (uid) => {
            if (uid === targetVictimId) return null;
            try {
                const s = await getDoc(doc(db, "users", uid));
                return s.exists() ? { uid, ...s.data() } : { uid, name: "Unknown", role: "normal" };
            } catch { return { uid, name: "Error", role: "normal" }; }
        })).then((results) => {
            setMembersInfo(results.filter(m => m !== null));
        });
    }

    // B. Fetch Victim Profile (CRITICAL FIX: Use targetVictimId fallback)
    if (targetVictimId) {
        getDoc(doc(db, "users", targetVictimId)).then((snap) => {
            if (snap.exists()) {
                setVictimProfile(snap.data());
            }
        });
    }
  }, [group]); // removed deep dependencies to ensure it runs once group loads

  // --- ACTIONS ---
  const sendText = async () => {
    if (!text.trim()) return;
    const msg = text.trim();
    setText("");
    let type = "text";
    if (sendToPoliceOnly && !isPolice) type = "private_to_police";
    await addDoc(collection(db, "groups", groupId, "messages"), {
      from: user.uid, text: msg, createdAt: serverTimestamp(), type: type
    });
    setSendToPoliceOnly(false);
  };

  const sendPrivateOrder = async () => {
    if (!privateOrderText.trim() || !privateOrderTarget) return;
    await addDoc(collection(db, "groups", groupId, "messages"), {
        from: user.uid, text: privateOrderText, to: privateOrderTarget.uid, createdAt: serverTimestamp(), type: "private_order"
    });
    setPrivateOrderText(""); setPrivateOrderTarget(null); setShowMembers(false);
  };

  const removeMember = async (targetUid) => {
      if(!window.confirm("Remove member?")) return;
      await updateDoc(doc(db, "groups", groupId), { members: arrayRemove(targetUid) });
      await addDoc(collection(db, "groups", groupId, "messages"), {
        from: "system", text: "Member removed by Police.", createdAt: serverTimestamp(), type: "system"
      });
  };

  const togglePrivateLocationAccess = async (targetUid) => {
      const currentList = group.locationAccessList || [];
      if (currentList.includes(targetUid)) {
          await updateDoc(doc(db, "groups", groupId), { locationAccessList: arrayRemove(targetUid) });
      } else {
          await updateDoc(doc(db, "groups", groupId), { locationAccessList: arrayUnion(targetUid) });
      }
  };

  const sendFile = async (file) => {
    if (!file) return;
    setSending(true);
    try {
      const path = `chat/${groupId}/${Date.now()}_${file.name}`;
      const r = sref(storage, path);
      const task = uploadBytesResumable(r, file);
      task.on('state_changed', null, () => setSending(false), async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          await addDoc(collection(db, "groups", groupId, "messages"), {
            from: user.uid, fileUrl: url, fileName: file.name, type: file.type.startsWith("image") ? "image" : "file", createdAt: serverTimestamp(),
          });
          setSending(false);
      });
    } catch { setSending(false); }
  };

  const updateInstructions = async () => {
    await updateDoc(doc(db, "groups", groupId), { instructions: instructionText });
    setIsEditingInstructions(false);
  };

  const toggleGlobalLocationLock = async () => {
    await updateDoc(doc(db, "groups", groupId), { locationShared: !group.locationShared });
  };

  const handleCloseSOS = async () => {
      if (!closeStatement.trim()) { alert("Statement mandatory."); return; }
      await updateDoc(doc(db, "groups", groupId), { status: 'closed' });
      if (group.sosRequestId) {
          await updateDoc(doc(db, "sosRequests", group.sosRequestId), {
              status: 'closed', closedAt: serverTimestamp(), closureStatement: closeStatement.trim(), closedBy: user.uid
          });
      }
      await addDoc(collection(db, "groups", groupId, "messages"), {
          from: "system", text: `🚨 CASE CLOSED. Statement: "${closeStatement.trim()}"`, createdAt: serverTimestamp(), type: "system"
      });
  };

  const getMapBackgroundUrl = (lat, lng) => {
      if (GOOGLE_MAPS_API_KEY) {
          return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x150&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
      }
      return "https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png"; 
  };

  const startNavigation = (lat, lng) => {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (!group) return <div className="gc-wrapper"><div style={{color:'white', marginTop:20}}>Loading...</div></div>;

  // --- ACCESS CHECKS ---
  const currentUserMember = membersInfo.find(m => m.uid === user?.uid);
  const isPolice = currentUserMember?.role === 'police' || user?.uid === POLICE_UID_FALLBACK;
  
  const targetVictimId = group.victimId || (group.members && group.members[0]);
  const isVictim = targetVictimId === user.uid;

  const hasPrivateAccess = Array.isArray(group.locationAccessList) && group.locationAccessList.includes(user.uid);
  const hasLocationAccess = isPolice || isVictim || group.locationShared === true || hasPrivateAccess;

  // --- LOCATION LOGIC (Fixed: Use Profile Last Known if Group Loc missing) ---
  let victimLoc = null;

  if (group.location && typeof group.location.lat === 'number') {
      victimLoc = { lat: group.location.lat, lng: group.location.lng };
  }
  else if (victimProfile && victimProfile.lastKnownLocation) {
      victimLoc = { 
          lat: victimProfile.lastKnownLocation.lat, 
          lng: victimProfile.lastKnownLocation.lng 
      };
  }

  const getDisplayName = (uid) => {
      const m = membersInfo.find(x => x.uid === uid);
      if (!m) return "User";
      if (m.role === 'police' || uid === POLICE_UID_FALLBACK) return <span>{m.name} 👮‍♂️ (Police)</span>;
      return m.name;
  };

  const headerTitle = isPolice 
    ? `Subject: ${victimProfile?.name || "Loading..."}` 
    : `Emergency - User`;

  return (
    <div className="gc-wrapper">
      <style>{`
  /* --- 1. GLOBAL RESET --- */
  .gc-wrapper, .gc-wrapper * { 
      box-sizing: border-box; 
      outline: none; 
      -webkit-tap-highlight-color: transparent;
  }

  /* --- 2. MAIN VIEWPORT LOCK --- */
  .gc-wrapper { 
      position: fixed; 
      top: 0; 
      left: 0; 
      right: 0; 
      bottom: 0; 
      background: #333; 
      z-index: 99999; 
      display: flex; 
      justify-content: center;
      overflow: hidden; 
      height: 100dvh; 
  }

  /* --- 3. FLEX CONTAINER --- */
  .gc-container { 
      width: 100%; 
      max-width: 420px; 
      background: #efe7dd; 
      background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png"); 
      background-repeat: repeat; 
      background-size: 300px; 
      display: flex; 
      flex-direction: column; 
      height: 100%; 
      position: relative;
  }
  
  @media (min-width: 600px) { 
      .gc-container { 
          height: 95dvh; 
          margin-top: 2.5dvh; 
          border-radius: 20px; 
          box-shadow: 0 0 0 10px #111; 
      } 
  }

  /* --- 4. HEADER (Fixed) --- */
  .gc-header { 
      background: #075e54; 
      color: white; 
      padding: 10px 16px; 
      display: flex; 
      align-items: center; 
      gap: 12px; 
      box-shadow: 0 1px 3px rgba(0,0,0,0.2); 
      z-index: 10; 
      flex-shrink: 0; 
      min-height: 60px;
  }
  .gc-header-info { flex: 1; cursor: pointer; }
  .gc-header-title { font-weight: 600; font-size: 16px; margin: 0; line-height: 1.2; }
  .gc-header-sub { font-size: 11px; opacity: 0.85; margin: 0; }
  .gc-icon { cursor: pointer; padding: 5px; font-size: 18px; }

  /* --- 5. CONTENT AREA (Fixed Parent) --- */
  .gc-content { 
      flex: 1; 
      display: flex; 
      flex-direction: column; 
      /* KEY CHANGE: Stop the main area from scrolling */
      overflow: hidden; 
  }

  /* --- 6. TOP CARDS (Map/Instructions - Fixed) --- */
  .gc-card-wrapper { 
      flex-shrink: 0; /* Prevent shrinking */
      padding: 10px 10px 0 10px; 
  }

  /* --- 7. MESSAGE LIST (Scrollable Child) --- */
  /* This targets the div containing the messages */
  .gc-content > div:last-child {
      flex: 1;                  /* Take up all remaining space */
      overflow-y: auto;         /* Scroll ONLY this section */
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch; 
      padding-bottom: 10px;     /* Breathing room before input */
  }

  /* --- 8. INPUT BAR (Fixed Bottom) --- */
  .gc-input-bar { 
      position: relative; 
      width: 100%; 
      background: #f0f0f0; 
      padding: 8px 10px; 
      display: flex; 
      align-items: center; 
      gap: 8px; 
      z-index: 20; 
      min-height: 60px; 
      flex-shrink: 0; 
      padding-bottom: calc(45px + env(safe-area-inset-bottom)); 
  }
  
  .gc-input-field { 
      flex: 1; 
      border: none; 
      border-radius: 20px; 
      padding: 10px 15px; 
      font-size: 15px; 
      outline: none; 
      background: #fff; 
      height: 40px; 
  }
  .gc-input-field.police-mode { border: 2px solid #3b82f6; background: #eff6ff; color: #1e3a8a; } 
  .gc-send-btn { background: #075e54; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; flex-shrink: 0; margin-left: 4px; }
  .gc-icon-btn { color: #54656f; font-size: 20px; padding: 5px; cursor: pointer; flex-shrink: 0; }
  .gc-shield-btn { color: #cbd5e1; font-size: 20px; padding: 5px; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
  .gc-shield-btn.active { color: #3b82f6; text-shadow: 0 0 10px rgba(59,130,246,0.5); }
  
  /* --- 9. COMPONENTS --- */
  .gc-live-btn { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 20px; color: white; padding: 4px 10px; font-size: 11px; display: flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap; }
  .gc-live-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: blink 1s infinite; }
  @keyframes blink { 50% { opacity: 0.5; } }
  
  .gc-card { background: white; border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); font-size: 13px; }
  .gc-card.police { border-left: 4px solid #075e54; }
  .gc-card.alert { background: #fff3cd; border-left: 4px solid #ffc107; color: #856404; }
  
  .gc-map-active { height: 120px; border-radius: 8px; display: flex; flex-direction: column; justify-content: flex-end; padding: 10px; background-size: cover; background-position: center; position: relative; box-shadow: inset 0 -40px 40px rgba(0,0,0,0.5); }
  .gc-map-overlay-text { color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8); z-index: 2; position: relative; width: 100%; }
  
  .gc-locked-zone { background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; color: #6b7280; display: flex; flex-direction: column; align-items: center; }
  .gc-btn-disabled { background: #e5e7eb; color: #9ca3af; border: none; padding: 8px 16px; border-radius: 20px; margin-top: 10px; font-weight: 600; cursor: not-allowed; }
  .gc-nav-btn { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); margin-left: auto; }
  
  .gc-chat-row { display: flex; margin: 4px 12px; }
  .gc-chat-row.right { justify-content: flex-end; }
  .gc-chat-row.left { justify-content: flex-start; }
  .gc-bubble { max-width: 80%; padding: 6px 10px; border-radius: 8px; box-shadow: 0 1px 1px rgba(0,0,0,0.15); font-size: 14px; position: relative; word-wrap: break-word; }
  .gc-bubble.mine { background: #dcf8c6; border-top-right-radius: 0; }
  .gc-bubble.other { background: #fff; border-top-left-radius: 0; }
  .gc-bubble.private { background: #fff8e1; border: 1px solid #ffc107; }
  .gc-bubble.to-police { background: #e0f2fe; border: 1px solid #3b82f6; }
  .gc-private-label { font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; display: block; }
  .gc-chat-name { font-size: 11px; font-weight: 700; color: #D41A59; margin-bottom: 2px; }
  .gc-chat-time { font-size: 10px; color: #999; text-align: right; margin-top: 2px; display: block; }
  .gc-img-preview { max-width: 100%; border-radius: 8px; }

  /* --- 10. MODALS --- */
  .gc-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 50; display: flex; align-items: center; justify-content: center; }
  .gc-modal { background: white; width: 90%; max-width: 350px; border-radius: 12px; padding: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 51; }
  .gc-modal-header { font-weight: 700; font-size: 18px; margin-bottom: 12px; display: flex; justify-content: space-between; }
  .gc-member-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  .gc-member-info { display: flex; flex-direction: column; }
  .gc-member-name { font-weight: 600; font-size: 14px; }
  .gc-member-role { font-size: 11px; color: #666; }
  .gc-btn-sm { font-size: 10px; padding: 4px 8px; border-radius: 4px; border: none; cursor: pointer; margin-left: 4px; }
  .gc-btn-danger { background: #fee2e2; color: #ef4444; }
  .gc-btn-action { background: #e0f2fe; color: #0284c7; }
  .gc-btn-success { background: #dcfce7; color: #166534; }
  .gc-close-btn { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; margin-top: 10px; width: 100%; cursor: pointer;}
  .gc-waiting-box { background: #f0fdf4; border: 1px dashed #4ade80; border-radius: 8px; padding: 20px; text-align: center; color: #166534; display: flex; flex-direction: column; align-items: center; }
`}</style>

      <div className="gc-container">
        
        {/* HEADER */}
        <div className="gc-header">
          <i className="fas fa-arrow-left gc-icon" onClick={(e) => { e.stopPropagation(); navigate(-1); }}></i>
          <div className="gc-header-info" onClick={() => setShowMembers(true)}>
            <div className="gc-header-title">{headerTitle}</div>
            <div className="gc-header-sub">
                {isPolice 
                    ? `Subject: ${victimProfile?.name || "Loading..."}` 
                    : `Active Responders: ${membersInfo.length}`
                }
            </div>
          </div>
          <button className="gc-live-btn" onClick={() => navigate(`/meet/${groupId}`)}>
              <div className="gc-live-dot"></div>
              <span>Live Video Call</span>
          </button>
        </div>

        <div className="gc-content">
          
          {/* 1. LOCATION CARD */}
          <div className="gc-card-wrapper">
              <div className="gc-card">
                  <div style={{fontSize: 12, color:'#666', marginBottom: 8}}>Victim's Live Location</div>
                  
                  {!hasLocationAccess ? (
                      <div className="gc-locked-zone">
                          <i className="fas fa-lock" style={{fontSize: 24, marginBottom: 8}}></i>
                          <div style={{fontWeight: 600}}>Restricted Access</div>
                          <div style={{fontSize: 11}}>Please request Police for Access</div>
                          <button className="gc-btn-disabled" disabled>Start Navigation</button>
                      </div>
                  ) : !victimLoc ? (
                      <div className="gc-waiting-box">
                          <i className="fas fa-exclamation-triangle" style={{fontSize: 24, marginBottom: 8, color: '#f59e0b'}}></i>
                          <div style={{fontWeight: 600, color: '#b45309'}}>Location Unavailable</div>
                          <div style={{fontSize: 11, color: '#b45309'}}>No GPS data in profile.</div>
                      </div>
                  ) : (
                      <div 
                        className="gc-map-active" 
                        style={{backgroundImage: `url('${getMapBackgroundUrl(victimLoc.lat, victimLoc.lng)}')`}}
                      >
                          <div className="gc-map-overlay-text">
                              <div style={{fontSize:10, opacity:0.9}}>LAT: {victimLoc.lat.toFixed(4)}, LNG: {victimLoc.lng.toFixed(4)}</div>
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop: 4}}>
                                  <span style={{fontWeight:700, display:'flex', alignItems:'center'}}>
                                      {hasPrivateAccess && !isPolice && !isVictim && (
                                          <span style={{color:'#4ade80', marginRight: 5, fontSize:9, background:'rgba(0,0,0,0.6)', padding:'2px 4px', borderRadius:4}}>
                                              <i className="fas fa-check-circle"></i> GRANTED
                                          </span>
                                      )}
                                      <i className="fa fa-circle" style={{color:'#ef4444', marginRight: 4}}></i> LIVE
                                  </span>
                                  <button className="gc-nav-btn" onClick={() => startNavigation(victimLoc.lat, victimLoc.lng)}>
                                      <i className="fas fa-location-arrow"></i> Navigate
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}

                  {isPolice && (
                       <div style={{textAlign:'right', marginTop:8, borderTop:'1px solid #eee', paddingTop:5}}>
                          <span onClick={toggleGlobalLocationLock} style={{fontSize:11, color:'#075e54', cursor:'pointer', fontWeight:700}}>
                              {group.locationShared ? "🔒 Lock for All" : "🔓 Unlock for All"}
                          </span>
                       </div>
                  )}
              </div>
          </div>

          {/* 2. POLICE INSTRUCTIONS */}
          <div className="gc-card-wrapper">
              {isPolice ? (
                  <div className="gc-card police">
                      <div style={{fontWeight: 700, marginBottom: 4, color:'#075e54'}}><i className="fas fa-shield-alt"></i> Police Instructions</div>
                      {isEditingInstructions ? (
                          <div style={{display:'flex', gap: 5}}>
                              <input className="gc-input-field" style={{padding:'6px', border:'1px solid #ddd'}} value={instructionText} onChange={(e) => setInstructionText(e.target.value)} />
                              <button className="gc-send-btn" style={{width:32, height:32}} onClick={updateInstructions}><i className="fas fa-check"></i></button>
                          </div>
                      ) : (
                          <div style={{display:'flex', justifyContent:'space-between', alignItems: 'flex-start'}}>
                              <span style={{flex:1}}>{group.instructions || "No active instructions."}</span>
                              <span onClick={() => setIsEditingInstructions(true)} style={{color:'#075e54', cursor:'pointer', fontWeight:600, fontSize:12, marginLeft: 8}}><i className="fas fa-pen"></i> Edit</span>
                          </div>
                      )}
                      <button className="gc-close-btn" onClick={() => setShowCloseModal(true)}>END EMERGENCY SOS</button>
                  </div>
              ) : group.instructions && (
                  <div className="gc-card alert"><strong><i className="fas fa-exclamation-circle"></i> Instructions:</strong> {group.instructions}</div>
              )}
          </div>

          {/* CHAT AREA */}
          <div style={{ marginTop: 15 }}>
              {messages.map((m) => {
                  const isMine = m.from === user.uid;
                  if (m.type === "private_order" && m.from !== user.uid && m.to !== user.uid) return null;
                  if (m.type === "private_to_police") { if (!isMine && !isPolice) return null; }
                  if (m.type === "system") return <div key={m.id} style={{textAlign:'center', fontSize:11, color:'#888', margin:'10px 0'}}>{m.text}</div>;

                  let bubbleClass = "other";
                  let showPrivateLabel = false;
                  let labelText = "";
                  
                  if (isMine) bubbleClass = "mine";
                  if (m.type === "private_order") { bubbleClass = "private"; showPrivateLabel=true; labelText="Private Order (Police)"; }
                  if (m.type === "private_to_police") { bubbleClass = "to-police"; showPrivateLabel=true; labelText="Secret to Police"; }

                  return (
                      <div key={m.id} className={`gc-chat-row ${isMine ? "right" : "left"}`}>
                          <div className={`gc-bubble ${bubbleClass}`}>
                              {showPrivateLabel && <span className="gc-private-label" style={{color: m.type==='private_to_police'?'#1e40af':'#b45309'}}><i className="fas fa-lock"></i> {labelText}</span>}
                              {!isMine && <div className="gc-chat-name">{getDisplayName(m.from)}</div>}
                              {m.type === "image" ? <img src={m.fileUrl} alt="sent" className="gc-img-preview"/> : m.fileUrl ? <div><i className="fas fa-file"></i> <a href={m.fileUrl} target="_blank" rel="noreferrer">Attachment</a></div> : <div>{m.text}</div>}
                              <span className="gc-chat-time">{m.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                      </div>
                  );
              })}
              <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT BAR */}
        <div className="gc-input-bar">
          <i className="fas fa-plus gc-icon-btn"></i>
          {!isPolice && (
              <i 
                  className={`fas fa-shield-alt gc-shield-btn ${sendToPoliceOnly ? 'active' : ''}`} 
                  onClick={() => setSendToPoliceOnly(!sendToPoliceOnly)}
                  title="Send Privately to Police"
              ></i>
          )}
          <input type="file" ref={fileRef} style={{display:'none'}} onChange={(e) => sendFile(e.target.files[0])} />
          <i className="fas fa-paperclip gc-icon-btn" onClick={() => fileRef.current.click()}></i>
          <input 
            className={`gc-input-field ${sendToPoliceOnly ? 'police-mode' : ''}`} 
            placeholder={sendToPoliceOnly ? "Message to Police only..." : "Message"} 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && sendText()} 
          />
          <button className="gc-send-btn" onClick={sendText} disabled={!text.trim() && !sending}>
              <i className={`fas ${text.trim() ? 'fa-paper-plane' : 'fa-microphone'}`}></i>
          </button>
        </div>

        {/* MODALS */}
        {showMembers && (
            <div className="gc-modal-overlay" onClick={() => { setShowMembers(false); setPrivateOrderTarget(null); }}>
                <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
                    {privateOrderTarget ? (
                        <>
                            <div className="gc-modal-header"><span>Order to {privateOrderTarget.name}</span><span onClick={() => setPrivateOrderTarget(null)} style={{cursor:'pointer'}}>✕</span></div>
                            <textarea style={{width:'100%', border:'1px solid #ddd', borderRadius:8, padding:10, minHeight:80, marginBottom:10}} placeholder="Type private instruction..." value={privateOrderText} onChange={(e) => setPrivateOrderText(e.target.value)} />
                            <button className="gc-send-btn" style={{width:'100%', borderRadius:8}} onClick={sendPrivateOrder}>Send</button>
                        </>
                    ) : (
                        <>
                            <div className="gc-modal-header"><span>Members ({membersInfo.length})</span><span onClick={() => setShowMembers(false)} style={{cursor:'pointer'}}>✕</span></div>
                            <div style={{maxHeight: 300, overflowY: 'auto'}}>
                                {membersInfo.map((m) => {
                                    const currentList = group.locationAccessList || [];
                                    const userHasLoc = currentList.includes(m.uid);
                                    return (
                                        <div key={m.uid} className="gc-member-row">
                                            <div className="gc-member-info">
                                                <div className="gc-member-name">
                                                    {m.name} {(m.role === 'police' || m.uid === POLICE_UID_FALLBACK) && " 👮‍♂️"}
                                                    {userHasLoc && <span style={{fontSize:10, marginLeft:5, color:'green'}}>(Has Loc)</span>}
                                                </div>
                                                <div className="gc-member-role">{m.role === 'police' ? 'Police Admin' : 'Responder'}</div>
                                            </div>
                                            {isPolice && m.uid !== user.uid && (
                                                <div style={{display:'flex'}}>
                                                    <button className={`gc-btn-sm ${userHasLoc ? 'gc-btn-danger' : 'gc-btn-success'}`} onClick={() => togglePrivateLocationAccess(m.uid)} title="Toggle Location Access">{userHasLoc ? <i className="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}</button>
                                                    <button className="gc-btn-sm gc-btn-action" onClick={() => setPrivateOrderTarget(m)}><i className="fas fa-comment-dots"></i></button>
                                                    <button className="gc-btn-sm gc-btn-danger" onClick={() => removeMember(m.uid)}><i className="fas fa-user-times"></i></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}
        {showCloseModal && (
            <div className="gc-modal-overlay">
                <div className="gc-modal" style={{border: '2px solid #ef4444'}}>
                    <div className="gc-modal-header" style={{color: '#ef4444'}}>
                        <span>End Emergency?</span>
                    </div>
                    <div style={{fontSize:13, color:'#333', marginBottom:10}}>
                        This will archive the SOS and close the chat group for everyone.
                        <br/><br/>
                        <strong>Statement of Closure (Mandatory):</strong>
                    </div>
                    <textarea 
                        style={{width:'100%', border:'1px solid #ddd', borderRadius:8, padding:10, minHeight:80, marginBottom:10}} 
                        placeholder="e.g. Suspect apprehended, victim safe..."
                        value={closeStatement} 
                        onChange={(e) => setCloseStatement(e.target.value)} 
                    />
                    <div style={{display:'flex', gap: 10}}>
                        <button className="gc-send-btn" style={{width:'100%', borderRadius:8, background: '#9ca3af'}} onClick={() => setShowCloseModal(false)}>Cancel</button>
                        <button className="gc-send-btn" style={{width:'100%', borderRadius:8, background: '#ef4444'}} onClick={handleCloseSOS}>CONFIRM END</button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
