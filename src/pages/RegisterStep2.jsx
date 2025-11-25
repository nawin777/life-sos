// src/pages/RegisterStep2.jsx
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import StepBar from "../components/StepBar";

function roleLabel(role) {
  if (role === "helper") return "Helper / Volunteer";
  if (role === "police") return "Police / Authority";
  return "Normal User";
}

export default function RegisterStep2() {
  const { role } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [idType, setIdType] = useState("aadhar");
  const [idNumber, setIdNumber] = useState("");
  const [designation, setDesignation] = useState("");
  const [idFile, setIdFile] = useState(null);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // step bar: when on step 2, we assume step 1 is completed
  const [completedSteps, setCompletedSteps] = useState(1);
  const currentStep = 2;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const refUser = doc(db, "users", user.uid);
      const snap = await getDoc(refUser);
      if (!snap.exists()) {
        // If somehow step1 wasn't done, send them back
        navigate(`/register/${role}/step1`);
        return;
      }
      setLoadingProfile(false);
    };
    load();
  }, [user, navigate, role]);

  if (!user) {
    return <Navigate to="/" />;
  }

  if (loadingProfile) {
    return (
      <div className="view">
        <div className="content">Loading profile…</div>
      </div>
    );
  }

  const displayRole = roleLabel(role);

  const handleFinish = async () => {
    if (!idNumber.trim() || !designation.trim()) {
      setError("Please fill ID number and designation.");
      return;
    }

    if (!agreeTerms) {
      setError(
        "You must accept the Terms of Use and Privacy Policy to continue."
      );
      return;
    }

    try {
      setBusy(true);
      setError("");

      const refUser = doc(db, "users", user.uid);

      let idProofUrl = null;
      if (idFile) {
        const storageRef = ref(
          storage,
          `idProofs/${user.uid}/${Date.now()}_${idFile.name}`
        );
        await uploadBytes(storageRef, idFile);
        idProofUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(refUser, {
        idProofType: idType,
        idProofNumber: idNumber,
        designation,
        idProofUrl: idProofUrl || null,
        verificationStatus: "pending",
      });

      // mark step2 completed in the UI right before navigating
      setCompletedSteps(2);

      // go to dashboard
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
      setError(e.message);
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
          <div className="header-title">Verification</div>
          <div className="header-subtitle">{displayRole}</div>
        </div>
        <span />
      </div>

      <div className="content">
        <StepBar currentStep={currentStep} completedSteps={completedSteps} />

        <div className="glass-card">
          <div className="field-label">ID Proof Type</div>
          <select
            className="select"
            value={idType}
            onChange={(e) => setIdType(e.target.value)}
          >
            <option value="aadhar">Aadhar / Govt ID</option>
            <option value="employee">Employee ID</option>
            <option value="police">Police ID</option>
            <option value="other">Other</option>
          </select>

          <div className="field-label">ID Proof Number</div>
          <input
            className="input"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="Enter ID number"
          />

          <div className="field-label">Designation</div>
          <input
            className="input"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder={
              role === "helper"
                ? "e.g., Student Volunteer"
                : role === "police"
                ? "e.g., Inspector"
                : "e.g., Working Professional"
            }
          />

          <div className="field-label">Upload ID Proof (image or PDF)</div>
          <input
            className="input"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setIdFile(e.target.files?.[0] || null)}
          />

          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#374151",
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
            }}
          >
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              I agree to the{" "}
              <a
                href="#"
                style={{ color: "#2563eb", textDecoration: "none" }}
              >
                Terms of Use
              </a>{" "}
              and{" "}
              <a
                href="#"
                style={{ color: "#2563eb", textDecoration: "none" }}
              >
                Privacy Policy
              </a>
              .
            </span>
          </div>

          {error && (
            <div style={{ color: "red", fontSize: 12, marginTop: 6 }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleFinish}
            disabled={busy}
            style={{ marginTop: 12 }}
          >
            {busy ? "Saving…" : "Finish & Go to Dashboard"}
          </button>
        </div>
      </div>

      <div className="footer-note">
        Step 2 of 2 • Verification details stored in Firestore & Storage
      </div>
    </div>
  );
}
