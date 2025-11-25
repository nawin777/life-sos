export default function Header({ title, subtitle, showBack, showProfile, onBack, onProfile }) {
  return (
    <div className="header">
      {showBack ? (
        <button className="back-button" onClick={onBack}>
          ◀ Back
        </button>
      ) : (
        <span />
      )}

      <div>
        <div className="header-title">{title}</div>
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>

      {showProfile ? (
        <button className="back-button" onClick={onProfile}>
          Profile
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
