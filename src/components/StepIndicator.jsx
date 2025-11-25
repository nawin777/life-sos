export default function StepIndicator({ stepCompleted }) {
  return (
    <div style={{
      display: "flex",
      gap: "14px",
      justifyContent: "center",
      marginBottom: "20px"
    }}>
      
      {/* STEP 1 */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "2px solid #2563EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: stepCompleted >= 1 ? "#2563EB" : "transparent",
          color: stepCompleted >= 1 ? "white" : "#2563EB",
          fontWeight: "bold"
        }}>
          {stepCompleted >= 1 ? "✔" : "1"}
        </div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Basic Info</div>
      </div>

      {/* LINE */}
      <div style={{
        width: 35,
        height: 2,
        background: stepCompleted >= 1 ? "#2563EB" : "#d1d5db",
        marginTop: 13
      }}></div>

      {/* STEP 2 */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "2px solid #2563EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: stepCompleted >= 2 ? "#2563EB" : "transparent",
          color: stepCompleted >= 2 ? "white" : "#2563EB",
          fontWeight: "bold"
        }}>
          {stepCompleted >= 2 ? "✔" : "2"}
        </div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Verification</div>
      </div>

    </div>
  );
}
