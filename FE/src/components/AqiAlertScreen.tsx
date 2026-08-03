import { ArrowLeft } from "lucide-react";
import type { PlaceCatalogItem } from "@/lib/guest-exercise-places";
import type { GpsAqiMeasurement } from "@/lib/types";
import "../styles/demo-alert.css";

type Props = {
  gpsAqi: GpsAqiMeasurement | null;
  gpsCoords: { lat: number; lng: number } | null;
  locations: PlaceCatalogItem[];
  onBack: () => void;
  onOpenSuggestion: (location: PlaceCatalogItem) => void;
};

export function AqiAlertScreen({ gpsAqi, gpsCoords, locations, onBack, onOpenSuggestion }: Props) {
  const aqiValue = gpsAqi?.aqi ?? null;
  const aqiLabel = aqiValue === null ? "--" : `${aqiValue}`;
  const aqiStatus =
    aqiValue === null
      ? "Chưa lấy"
      : aqiValue <= 50
      ? "Tốt"
      : aqiValue <= 100
      ? "Trung bình"
      : aqiValue <= 150
      ? "Cần chú ý"
      : "Nguy hiểm";
  const alertText =
    aqiValue === null
      ? "Hiện chưa có dữ liệu AQI. Vui lòng thử lại sau."
      : aqiValue > 150
      ? "Mức ô nhiễm đang rất cao. Hạn chế ra ngoài, ưu tiên tập trong nhà và đeo khẩu trang tiêu chuẩn."
      : aqiValue > 100
      ? "Chất lượng không khí đang xấu đi. Hãy giảm cường độ hoạt động ngoài trời và chọn nơi sạch hơn."
      : "Tình trạng không khí hiện ở mức chấp nhận được. Bạn có thể cân nhắc điểm tập an toàn hơn nếu cần.";

  const expertAdviceText =
    aqiValue === null
      ? "Không thể lấy dữ liệu AQI. Vui lòng thử lại sau."
      : aqiValue > 150
      ? "Nếu buộc phải ra ngoài, hãy dùng khẩu trang N95 và chọn nơi có hệ thống lọc không khí. Khi AQI trên 150, tập trong nhà là an toàn nhất."
      : aqiValue > 100
      ? "Hãy tránh vận động ngoài trời cường độ cao trong thời gian dài. Người nhạy cảm hô hấp nên ưu tiên cơ sở thể thao trong nhà."
      : aqiValue > 50
      ? "Chất lượng không khí nhìn chung ổn, nhưng nếu bạn nhạy cảm thì hãy giảm cường độ khi thấy khó chịu."
      : "Chất lượng không khí hiện rất tốt. Bạn có thể thoải mái tập luyện và hoạt động ngoài trời.";

  const isIndoor = (loc: PlaceCatalogItem) => 
    loc.filter_type === "gym" || 
    loc.location_type === "indoor_place" || 
    (loc.categories || "").toLowerCase().includes("gym");

  const indoorLocations = locations.filter(isIndoor);
  const candidateList = indoorLocations.length > 0 ? indoorLocations : locations;

  const suggestion = [...candidateList].sort((a, b) => {
    // 1. Nearest (bucketed by 0.1km ~ 100m)
    const distDiff = Math.round((a.distance_km ?? 999) * 10) - Math.round((b.distance_km ?? 999) * 10);
    if (distDiff !== 0) return distDiff;

    // 2. Cleanest (lowest AQI)
    const aqiDiff = (a.aqi_level ?? 999) - (b.aqi_level ?? 999);
    if (aqiDiff !== 0) return aqiDiff;

    // 3. Highest rating
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;

    return a.name.localeCompare(b.name);
  })[0] ?? locations[0];

  const distanceText = suggestion?.distance_km ? `${suggestion.distance_km.toFixed(1)} km` : "0.8 km";

  return (
    <div className="demo-alert-container">
      <header className="alert-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={16} /> Trang chủ
        </button>
      </header>

      <main className="alert-content">
        {/* add zone class to control color based on AQI */}
        <section
          className={`health-alert-zone ${
            aqiValue === null
              ? "zone-unknown"
              : aqiValue <= 50
              ? "zone-good"
              : aqiValue <= 100
              ? "zone-moderate"
              : aqiValue <= 150
              ? "zone-sensitive"
              : "zone-danger"
          }`}
        >
          <span className="alert-label">⚠️ Cảnh báo sức khỏe</span>
          <h1 className="huge-aqi-value">{aqiLabel}</h1>
          <div className="aqi-level-badge">{aqiStatus}</div>
          <p className="alert-message-text">{alertText}</p>
        </section>

        <div className="suggestion-header-row">
          <h3 className="section-title-alert">Điểm tập an toàn</h3>
          <span className="recommend-tag">Đề xuất</span>
        </div>

        <div className="spot-suggestion-card">
          {(() => {
            const haystack = [
              suggestion?.name,
              suggestion?.location_type,
              suggestion?.categories,
              suggestion?.description
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            
            let fallbackImg = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80"; // gym
            if (/(cong vien|park|garden|outdoor)/.test(haystack)) {
              fallbackImg = "https://static.vinwonders.com/production/cong-vien-1.jpg";
            } else if (/(stadium|court|track|arena|sports complex|sport|gymnastics|boxing|martial arts|badminton|tennis|basketball|football|futsal|swimming|pool)/.test(haystack)) {
              fallbackImg = "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80";
            }

            const imgSrc = suggestion?.featured_image || fallbackImg;

            return (
              <img
                src={imgSrc}
                alt={suggestion?.name || "spot"}
                className="spot-card-img"
                onError={(e) => {
                  e.currentTarget.src = fallbackImg;
                }}
              />
            );
          })()}

          <div className="spot-card-body">
            <div className="spot-card-info">
              <h4 className="spot-title">{suggestion?.name ?? "Điểm gợi ý"}</h4>
              <p className="spot-meta">📍  {distanceText}</p>
              <div className="spot-amenities-badges">
                <span className="amenity-mini">Không khí trong lành</span>
                <span className="amenity-mini">Không gian thoáng đãng</span>
              </div>
            </div>
            <div className="spot-card-rating">
              <span className="rating-num">{suggestion?.rating ?? 4.8}</span>
            </div>
          </div>

          <button
            className="btn-route-guidance"
            onClick={() => suggestion && onOpenSuggestion(suggestion)}
            disabled={!suggestion}
          >
            💚 Xem chi tiết
          </button>
        </div>

        <div className="expert-advice-card">
          <div className="expert-header">
            <span className="expert-icon">👨‍⚕️</span>
            <h4>Lời khuyên chuyên gia</h4>
          </div>
          <p className="expert-text">
            {expertAdviceText}
          </p>
        </div>
      </main>
    </div>
  );
}
