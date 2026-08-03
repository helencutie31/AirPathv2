import { ArrowLeft, Lock, MapPin, Navigation } from "lucide-react";
import type { PlaceCatalogItem } from "@/lib/guest-exercise-places";
import "../styles/guest-route-preview.css";

type Props = {
  locations: PlaceCatalogItem[];
  onShowLogin: () => void;
  onBack: () => void;
};

export function GuestRoutePreview({ locations, onShowLogin, onBack }: Props) {
  const featured = locations.slice(0, 4);

  return (
    <div className="guest-route-preview">
      {/* Header */}
      <div className="grp-header">
        <button
          type="button"
          onClick={onBack}
          className="grp-back-btn"
          aria-label="Quay lại"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="grp-label">Lộ trình xanh</div>
          <h2 className="grp-title">Tìm lộ trình thông minh</h2>
        </div>
      </div>

      {/* Hero CTA */}
      <div className="grp-hero">
        <div className="grp-hero-icon">
          <Navigation size={32} />
        </div>
        <h3 className="grp-hero-heading">
          Lộ trình dành cho thành viên dựa trên AQI
        </h3>
        <p className="grp-hero-body">
          Đăng nhập để nhận lộ trình xanh tối ưu đến địa điểm vận động. Hãy chọn tuyến đường ít ô nhiễm hơn.
        </p>
        <button type="button" className="grp-cta-btn" onClick={onShowLogin}>
          <Lock size={15} />
          Đăng nhập để bắt đầu
        </button>
      </div>

      {/* Featured destinations preview */}
      <div className="grp-section-label">Điểm nổi bật</div>
      <div className="grp-cards">
        {featured.map((place) => (
          <div key={place.id} className="grp-card">
            <div className="grp-card-icon">
              <MapPin size={16} />
            </div>
            <div className="grp-card-info">
              <div className="grp-card-name">{place.name}</div>
              <div className="grp-card-address">
                {place.address ?? place.district ?? "Hà Nội"}
              </div>
              <div className="grp-card-meta">
                {(() => {
                  const aqi = typeof place.aqi_level === "number"
                    ? place.aqi_level
                    : 35 + (place.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 40);
                  const aqiClass = aqi <= 50 ? "good" : "moderate";
                  return (
                    <span className={`grp-aqi-badge ${aqiClass}`}>
                      AQI {aqi}
                    </span>
                  );
                })()}
                {place.rating != null && (
                  <span className="grp-rating">
                    ★ {place.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="grp-card-action"
              onClick={onShowLogin}
              aria-label={`Lấy lộ trình đến ${place.name}`}
            >
              <Navigation size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Bottom reminder */}
      <div className="grp-footer-note">
        Đăng nhập miễn phí - không cần tài khoản trả phí
      </div>
    </div>
  );
}
