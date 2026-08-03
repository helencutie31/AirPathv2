import { RefreshCw, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import type { DashboardResponse, GpsAqiMeasurement } from "@/lib/types";
import { fetchAqicnAqi } from "@/lib/api";
import "../styles/demo-home.css";

type Props = {
  dashboard: DashboardResponse | null;
  advice: { severity: string; title: string; body: string } | null;
  onOpenAqiAlert: () => void;
  gpsAqi: GpsAqiMeasurement | null;
  gpsCoords: { lat: number; lng: number } | null;
  gpsLoading: boolean;
  gpsError: string | null;
  onRefreshGpsAqi: () => void;
};

type AqiSource = "iqair" | "aqicn";

function getAqiLabel(value: number | null): string {
  if (value === null) return "Chưa có dữ liệu";
  if (value <= 50) return "Tốt";
  if (value <= 100) return "Trung bình";
  if (value <= 150) return "Không tốt cho người nhạy cảm";
  if (value <= 200) return "Xấu";
  return "Nguy hiểm";
}

function getAqiColorClass(value: number | null): string {
  if (value === null) return "aqi-unknown";
  if (value <= 50) return "aqi-good";
  if (value <= 100) return "aqi-moderate";
  if (value <= 150) return "aqi-sensitive";
  if (value <= 200) return "aqi-bad";
  return "aqi-very-bad";
}

function getAqiAdvice(value: number | null): { title: string; body: string } {
  if (value === null) return { title: "Chưa có AQI", body: "Cập nhật dữ liệu để xem gợi ý phù hợp với chất lượng không khí hiện tại." };
  if (value <= 50) return { title: "AQI đang tốt", body: "Bạn có thể hoạt động ngoài trời như bình thường. Khi tập luyện, đừng quên khởi động và uống đủ nước." };
  if (value <= 100) return { title: "AQI ở mức trung bình", body: "Bạn vẫn có thể ra ngoài, nhưng nên hạn chế hoạt động cường độ cao kéo dài và chú ý triệu chứng hô hấp." };
  if (value <= 150) return { title: "Không tốt cho người nhạy cảm", body: "Người cao tuổi, trẻ em và người có bệnh hô hấp nên hạn chế ra ngoài. Nếu cần di chuyển, hãy chọn lộ trình ngắn." };
  if (value <= 200) return { title: "AQI đang xấu đi", body: "Hạn chế hoạt động ngoài trời và ưu tiên ở trong nhà. Nếu cần di chuyển, nên dùng khẩu trang lọc bụi mịn." };
  return { title: "AQI đang rất xấu", body: "Hãy ở trong nhà nhiều nhất có thể, đóng cửa sổ và chỉ ra ngoài khi thật cần thiết. Khi di chuyển, hãy giảm tối đa thời gian tiếp xúc." };
}

/** Generate recommended exercise time slots based on current AQI */
function getRecommendedSlots(aqi: number | null): Array<{ time: string; label: string; safe: boolean; icon: string }> {
  const now = new Date();
  const hour = now.getHours();

  // Base slots: early morning, late afternoon, evening (Hanoi pattern)
  const slots = [
    { time: "05:00 – 07:00", label: "Sáng sớm", safe: true, icon: "🌅" },
    { time: "16:30 – 18:00", label: "Chiều tối", safe: true, icon: "🌤" },
    { time: "19:00 – 20:30", label: "Buổi tối", safe: true, icon: "🌙" },
  ];

  if (aqi === null) {
    return slots.map(s => ({ ...s, safe: true }));
  }

  if (aqi > 150) {
    // Dangerous — no outdoor slots safe
    return [
      { time: "05:00 – 07:00", label: "Sáng sớm", safe: false, icon: "⛔" },
      { time: "16:30 – 18:00", label: "Chiều tối", safe: false, icon: "⛔" },
      { time: "Cơ sở trong nhà", label: "Gợi ý cả ngày", safe: true, icon: "🏋️" },
    ];
  }

  if (aqi > 100) {
    // Moderate risk — only early morning marginally OK
    return [
      { time: "05:00 – 06:30", label: "Sáng sớm, thời gian ngắn", safe: true, icon: "🌅" },
      { time: "16:30 – 18:00", label: "Chiều tối", safe: false, icon: "⚠️" },
      { time: "19:00 – 20:30", label: "Buổi tối", safe: false, icon: "⚠️" },
    ];
  }

  // Good / moderate AQI — all slots safe, highlight best one
  // Avoid midday heat (10–14h) in Hanoi
  if (hour >= 10 && hour < 16) {
    return [
      { time: "05:00 – 07:00", label: "Sáng sớm, tốt nhất", safe: true, icon: "⭐" },
      { time: "16:30 – 18:00", label: "Chiều tối", safe: true, icon: "🌤" },
      { time: "19:00 – 20:30", label: "Buổi tối", safe: true, icon: "🌙" },
    ];
  }

  return slots;
}

export function HomeViewDemo({
  dashboard,
  advice,
  onOpenAqiAlert,
  gpsAqi,
  gpsCoords,
  gpsLoading,
  gpsError,
  onRefreshGpsAqi,
}: Props) {
  const [activeSource, setActiveSource] = useState<AqiSource>("iqair");
  const [aqicnData, setAqicnData] = useState<GpsAqiMeasurement | null>(null);
  const [aqicnLoading, setAqicnLoading] = useState(false);
  const [aqicnError, setAqicnError] = useState<string | null>(null);

  const handleSwitchToAqicn = async () => {
    setActiveSource("aqicn");
    if (aqicnData) return; // already loaded

    const lat = gpsCoords?.lat ?? 21.0041;
    const lng = gpsCoords?.lng ?? 105.8428;
    setAqicnLoading(true);
    setAqicnError(null);
    try {
      const res = await fetchAqicnAqi(lat, lng);
      setAqicnData(res.measurement);
    } catch (err) {
      setAqicnError(err instanceof Error ? err.message : "Không thể lấy dữ liệu AQICN");
    } finally {
      setAqicnLoading(false);
    }
  };

  const handleSwitchToIqair = () => {
    setActiveSource("iqair");
    onRefreshGpsAqi();
  };

  const displayedMeasurement = activeSource === "aqicn" && aqicnData ? aqicnData : gpsAqi;

  const aqi = displayedMeasurement?.aqi ?? dashboard?.nearestAqi?.aqi ?? null;
  const locationName = displayedMeasurement?.location_name ?? dashboard?.nearestAqi?.location_name ?? "Chưa có dữ liệu";
  const source = displayedMeasurement?.source ?? "system";
  const coordinates = gpsCoords ? `(${gpsCoords.lat.toFixed(3)}, ${gpsCoords.lng.toFixed(3)})` : "";

  const adviceContent = aqi === null
    ? { title: advice?.title ?? "Gợi ý sức khỏe", body: advice?.body ?? "Cập nhật hồ sơ để nhận gợi ý phù hợp hơn." }
    : getAqiAdvice(aqi);

  const weather = {
    temp: (displayedMeasurement as GpsAqiMeasurement | null)?.temperature ?? "-",
    humidity: (displayedMeasurement as GpsAqiMeasurement | null)?.humidity ?? "-",
  };

  const recommendedSlots = getRecommendedSlots(aqi);
  const isLoading = activeSource === "iqair" ? gpsLoading : aqicnLoading;
  const error = activeSource === "iqair" ? gpsError : aqicnError;

  return (
    <div className="demo-home-container">
      {/* AQI Circle */}
      <div className="aqi-section">
        <div className={`aqi-circle-border ${isLoading ? "aqi-unknown" : getAqiColorClass(aqi)}`} onClick={onOpenAqiAlert}>
          <div className="aqi-value">{isLoading ? "--" : (aqi ?? "--")}</div>
          <div className="aqi-label">{isLoading ? "Đang lấy thông tin..." : `AQI - ${getAqiLabel(aqi)}`}</div>
        </div>
      </div>

      {/* Source Selector */}
      <div className="source-container">
        <button
          className={`source-btn ${activeSource === "iqair" ? "active" : ""}`}
          onClick={handleSwitchToIqair}
          disabled={isLoading}
        >
          <span className={`dot ${activeSource === "iqair" ? "green" : ""}`} />
          Nguồn chính: IQAir
          {activeSource === "iqair" && gpsLoading && <span className="source-loading">Đang cập nhật...</span>}
          {gpsAqi && activeSource !== "iqair" && <span className="source-loaded-badge">Đã lấy</span>}
        </button>
        <button
          className={`source-btn ${activeSource === "aqicn" ? "active" : ""}`}
          onClick={handleSwitchToAqicn}
          disabled={aqicnLoading}
        >
          <span className={`dot ${activeSource === "aqicn" ? "green" : ""}`} />
          Nguồn thay thế: AQICN
          {aqicnLoading && <span className="source-loading">Đang lấy...</span>}
          {aqicnData && activeSource !== "aqicn" && <span className="source-loaded-badge">Đã lấy</span>}
        </button>
      </div>



      {/* Advice Card */}
      <div className="advice-card">
        <div className="card-icon">💚</div>
        <div className="advice-content">
          <h3>{adviceContent.title}</h3>
          <p>{adviceContent.body}</p>
        </div>
      </div>

      {/* Recommended Exercise Time Slots */}
      <div className="time-slots-card">
        <div className="time-slots-header">
          <Clock size={16} className="time-slots-icon" />
          <h3>Khung giờ vận động gợi ý hôm nay</h3>
        </div>
        <div className="time-slots-list">
          {recommendedSlots.map((slot, i) => (
            <div key={i} className={`time-slot-item ${slot.safe ? "safe" : "unsafe"}`}>
              <span className="slot-icon">{slot.icon}</span>
              <div className="slot-info">
                <span className="slot-time">{slot.time}</span>
                <span className="slot-label">{slot.label}</span>
              </div>
              <span className={`slot-badge ${slot.safe ? "badge-safe" : "badge-unsafe"}`}>
                {slot.safe ? "Gợi ý" : "Cẩn trọng"}
              </span>
            </div>
          ))}
        </div>
        {aqi !== null && aqi > 100 && (
          <p className="time-slots-note">⚠️ AQI hiện đang cao, bạn nên ưu tiên cơ sở trong nhà.</p>
        )}
      </div>

      {/* Weather Info */}
      <div className="weather-row">
        <div className="weather-box">
          <div className="weather-summary">
            <span className="weather-icon">☀️</span>
            <div className="weather-text">
              <span className="temp">{weather.temp}°C</span>
              <span className="humidity">Độ ẩm {weather.humidity}%</span>
            </div>
          </div>
          <button className="refresh-btn" onClick={activeSource === "iqair" ? onRefreshGpsAqi : handleSwitchToAqicn} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Location Info */}
      <div className="location-info">
        <div className="info-item">
          <MapPin size={16} className="icon" />
          <span>{locationName}</span>
        </div>
        <div className="info-item">
          <span className="info-label-small">Nguồn:</span> {source} {coordinates}
        </div>
      </div>
    </div>
  );
}
