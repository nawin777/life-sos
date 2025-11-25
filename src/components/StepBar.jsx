// src/components/StepBar.jsx
export default function StepBar({ currentStep, completedSteps }) {
  const step1Completed = completedSteps >= 1;
  const step2Completed = completedSteps >= 2;

  return (
    <div className="step-bar">
      {/* STEP 1 */}
      <div className="step-node">
        <div
          className={
            "step-circle " +
            (step1Completed
              ? "completed"
              : currentStep === 1
              ? "active"
              : "")
          }
        >
          {step1Completed ? "✔" : "1"}
        </div>
        <div className="step-label">Basic</div>
      </div>

      {/* LINE */}
      <div
        className={
          "step-line " + (completedSteps >= 1 ? "completed" : "")
        }
      />

      {/* STEP 2 */}
      <div className="step-node">
        <div
          className={
            "step-circle " +
            (step2Completed
              ? "completed"
              : currentStep === 2
              ? "active"
              : "")
          }
        >
          {step2Completed ? "✔" : "2"}
        </div>
        <div className="step-label">Verification</div>
      </div>
    </div>
  );
}
