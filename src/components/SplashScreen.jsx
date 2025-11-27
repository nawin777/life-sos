import React from "react";

export default function SplashScreen() {
  return (
    <div className="splash-container">
      <style>{`
        .splash-container {
          /* Positioning to fit perfectly inside the phone frame */
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          
          /* Inherit rounded corners from parent #root */
          border-radius: inherit;
          overflow: hidden;

          background: linear-gradient(135deg, #fff5f7 0%, #ffffff 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        /* Logo Wrapper */
        .splash-logo-wrapper {
          position: relative;
          width: 130px;
          height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        /* The Circle */
        .splash-logo-circle {
          width: 100px;
          height: 100px;
          background: #D41A59; /* Brand Color Background */
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px rgba(212, 26, 89, 0.4);
          z-index: 2;
          position: relative;
        }

        /* The Pulse Animation */
        .splash-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(212, 26, 89, 0.2);
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          z-index: 1;
        }

        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }

        /* Text inside circle */
        .splash-logo-text {
          color: white;
          font-weight: 800;
          font-size: 32px;
          letter-spacing: 2px;
        }

        /* Typography */
        .splash-app-name {
          font-size: 28px;
          font-weight: 800;
          color: #1f2937;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
          opacity: 0;
          animation: fadeUp 0.8s ease-out forwards 0.2s;
        }

        .splash-subtitle {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 40px;
          opacity: 0;
          animation: fadeUp 0.8s ease-out forwards 0.4s;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Loading Dots */
        .loading-dots {
          display: flex;
          gap: 6px;
        }
        .dot {
          width: 10px;
          height: 10px;
          background: #D41A59;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>

      <div className="splash-logo-wrapper">
        <div className="splash-pulse"></div>
        <div className="splash-logo-circle">
          <span className="splash-logo-text">SOS</span>
        </div>
      </div>

      <div className="splash-app-name">Life SOS</div>
      <div className="splash-subtitle">Stay safe. Help fast.</div>

      <div className="loading-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  );
}