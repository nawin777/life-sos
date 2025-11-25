import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav({ role, nearbyCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isHelperLike = role === "helper" || role === "police";
  const currentPath = location.pathname;

  const go = (path) => () => navigate(path);

  const item = (path, icon, label, extra) => (
    <div
      className={
        "bottom-item " + (currentPath === path ? "active" : "")
      }
      onClick={go(path)}
    >
      <div className="bottom-item-inner">
        <span className="bottom-item-icon">{icon}</span>
        <span className="bottom-item-label">{label}</span>
        {extra}
      </div>
    </div>
  );

  return (
    <div className="bottom-nav">
      {item("/dashboard", "🏠", "Home")}
      {item("/news", "📰", "News")}
      {isHelperLike &&
        item(
          "/nearby",
          "📍",
          "Nearby",
          nearbyCount > 0 && (
            <span className="bottom-item-badge">
              {nearbyCount > 9 ? "9+" : nearbyCount}
            </span>
          )
        )}
      
    </div>
  );
}
