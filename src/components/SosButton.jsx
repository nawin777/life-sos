export default function SosButton({ onClick }) {
  return (
    <div className="sos-wrapper">
      <div className="sos-button" onClick={onClick}>
        <div className="sos-pulse"></div>
        SOS
      </div>
    </div>
  );
}
