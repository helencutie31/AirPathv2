import { MapPin, Star, Activity, ArrowLeft, Languages } from "lucide-react";
import { useState } from "react";
import type { PlaceCatalogItem } from "@/lib/guest-exercise-places";
import { translateReviewContent } from "@/lib/api";
import type { GpsAqiMeasurement, LocationReview } from "@/lib/types";
import { getAvatarPreset, getAvatarSelectionStyle, type AvatarSelection } from "@/lib/avatar-presets";
import "../styles/demo-detail.css";

type Props = {
  location: PlaceCatalogItem | null;
  onOpenRoute: () => void;
  onOpenReviews?: () => void;
  onBack?: () => void;
  isGuest: boolean;
  onRequireLogin?: () => void;
  onShowLogin?: () => void;
  reviews: LocationReview[];
  reviewsLoading?: boolean;
  reviewsError?: string | null;
  aqiMeasurement: GpsAqiMeasurement | null;
  aqiLoading?: boolean;
  aqiError?: string | null;
  onSubmitReview: (payload: { rating: number; content: string }) => Promise<void>;
  currentUserId: string;
  currentUserAvatarSelection: AvatarSelection;
};

export function LocationDetailView({
  location,
  onOpenRoute,
  onOpenReviews,
  onBack,
  isGuest,
  onRequireLogin,
  onShowLogin,
  reviews,
  reviewsLoading = false,
  reviewsError,
  aqiMeasurement,
  aqiLoading = false,
  aqiError,
  onSubmitReview,
  currentUserId,
  currentUserAvatarSelection,
}: Props) {
  const [reviewText, setReviewText] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  // Translate state: reviewId -> { translated, loading, shown }
  const [translateMap, setTranslateMap] = useState<Record<string, { text: string; loading: boolean; shown: boolean }>>({});

  async function handleTranslateReview(review: LocationReview) {
    const existing = translateMap[review.id];
    // Toggle off if already shown
    if (existing?.shown) {
      setTranslateMap((prev) => ({ ...prev, [review.id]: { ...existing, shown: false } }));
      return;
    }
    // If already fetched, just show it
    if (existing?.text) {
      setTranslateMap((prev) => ({ ...prev, [review.id]: { ...existing, shown: true } }));
      return;
    }
    // Fetch translation
    setTranslateMap((prev) => ({ ...prev, [review.id]: { text: "", loading: true, shown: false } }));
    try {
      const result = await translateReviewContent(review.content, "JA");
      setTranslateMap((prev) => ({
        ...prev,
        [review.id]: { text: result.translated, loading: false, shown: true },
      }));
    } catch {
      setTranslateMap((prev) => ({ ...prev, [review.id]: { text: "", loading: false, shown: false } }));
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) {
      alert("Vui lòng nhập bình luận.");
      return;
    }

    if (userRating < 1) {
      alert("Vui lòng chọn số sao đánh giá.");
      return;
    }

    if (isGuest) {
      onRequireLogin?.();
      return;
    }

    setSubmittingReview(true);

    try {
      await onSubmitReview({ rating: userRating, content: reviewText.trim() });
      setReviewText("");
      setUserRating(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể gửi bình luận.";
      alert(message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!location) {
    return (
      <div className="demo-detail-container">
        <div className="empty-state">
          <MapPin size={48} className="empty-icon" />
          <p>Chưa chọn địa điểm</p>
        </div>
      </div>
    );
  }

  const apiAqi = aqiMeasurement?.aqi ?? null;
  const apiPm25 = apiAqi != null ? (apiAqi * 0.4).toFixed(1) : null;
  const smallCircleValue = apiAqi ?? (aqiLoading ? null : "--");
  const smallCircleLabel = apiAqi != null ? "AQI" : aqiLoading ? "Đang lấy" : "Chưa lấy";
  const pm25Value = apiPm25 ?? "--";

  return (
    <div className="demo-detail-container">
      {/* Header - Location Title */}
      <div className="detail-header">
        <button
          type="button"
          onClick={() => onBack?.()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-3xl bg-slate-100/90 text-slate-900 ring-1 ring-white/10 transition hover:bg-slate-100"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="detail-header-main">
          <h2 className="detail-title">{location.name}</h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <span className="green-sub-badge" style={{ margin: 0 }}>📍 Địa điểm an toàn</span>
          </div>
          <p className="detail-location">
            <MapPin size={14} className="inline" />
            {location.address || "Hà Nội, Việt Nam"}
          </p>
        </div>
        <div className="detail-actions">
          <button
            type="button"
            className="btn-directions"
            onClick={() => onOpenRoute?.()}
          >
            Chỉ đường
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-circle-box">
          <div className={`small-aqi-circle ${getAqiColorClass(apiAqi)}`}>
            <div className="circle-value">{smallCircleValue ?? "..."}</div>
            <div className="circle-label">{smallCircleLabel}</div>
          </div>
          <span className="stat-desc">
            {apiAqi != null ? "AQI từ IQAir" : aqiLoading ? "Đang lấy AQI" : "Chưa có AQI"}
            <br />
            <small className="green-text">{apiAqi != null ? "Đã cập nhật thời gian thực" : aqiLoading ? "Vui lòng chờ trong giây lát" : "Giá trị ước tính"}</small>
          </span>
        </div>
        <div className="stat-pm25-box">
          <span className="pm25-title">🍃 PM2.5</span>
          <span className="pm25-value">{pm25Value} µg/m³</span>
          <p className="pm25-desc">Trong ngưỡng WHO khuyến nghị</p>
        </div>
      </div>

      {aqiError && <div className="aqi-error-message">Lỗi AQI: {aqiError}</div>}

      {/* Amenities */}
      {Array.isArray(location.amenities) && location.amenities.length > 0 && (
        <div className="amenities-section">
          <h4>Tiện ích</h4>
          <div className="amenities-tags">
            {location.amenities.map((amenity, idx) => (
              <span key={idx} className="amenity-tag">
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Introduction Card */}
      <div className="card intro-card">
        <h4>Tổng quan</h4>
        <p>
          {location.description ||
            "Môi trường ngoài trời tốt và an toàn để sử dụng. Chất lượng không khí phù hợp cho vận động và thư giãn."}
        </p>
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <div className="reviews-header-row">
          <h4>Đánh giá ({reviews.length})</h4>
          {onOpenReviews && (
            <button className="view-all-link" onClick={onOpenReviews}>
              Xem tất cả
            </button>
          )}
        </div>

        {/* Review Input Box */}
        {!isGuest && (
          <div className="input-review-box">
            <textarea
              className="review-textarea"
              placeholder="Hãy chia sẻ trải nghiệm của bạn..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
            <div className="review-footer">
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${star <= userRating ? "active" : ""}`}
                    onClick={() => setUserRating(star)}
                  >
                    <Star size={16} fill={star <= userRating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
              <button className="btn-submit-review" onClick={handleSubmitReview} disabled={submittingReview}>
                {submittingReview ? "Đang gửi..." : "Gửi"}
              </button>
            </div>
          </div>
        )}

        {isGuest && (
          <div className="login-prompt">
            <p>Vui lòng đăng nhập để viết đánh giá</p>
            <button
              className="btn-login"
              onClick={() => {
                if (onShowLogin) {
                  onShowLogin();
                } else {
                  onRequireLogin?.();
                }
              }}
            >
              Đăng nhập
            </button>
          </div>
        )}

        {/* Reviews List */}
        <div className="reviews-list">
          {reviewsError && <p className="no-reviews">{reviewsError}</p>}
          {reviewsLoading ? (
            <p className="no-reviews">Đang tải đánh giá...</p>
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="rev-user-info">
                  {review.user_id === currentUserId ? (
                    <span className="rev-avatar rev-avatar-custom" style={getAvatarSelectionStyle(currentUserAvatarSelection)}>
                      <img
                        src={getAvatarPreset(currentUserAvatarSelection.avatarId).src}
                        alt="Ảnh đại diện của bạn"
                        onError={(event) => {
                          event.currentTarget.src = getAvatarPreset(currentUserAvatarSelection.avatarId).fallbackSrc;
                        }}
                      />
                    </span>
                  ) : (
                    <span className="rev-avatar">{review.author.slice(0, 1).toUpperCase()}</span>
                  )}
                  <div className="rev-user-details">
                    <h5>{review.author}</h5>
                    <span className="stars">
                      {Array(review.rating)
                        .fill(0)
                        .map((_, i) => (
                          <Star key={i} size={12} fill="#ffc107" color="#ffc107" />
                        ))}
                    </span>
                  </div>
                  <span className="rev-date">{formatRelativeTime(review.created_at)}</span>
                </div>
                <p className="rev-text">"{review.content}"</p>
                {/* Translate button */}
                <div className="rev-translate-row">
                  <button
                    type="button"
                    className="rev-translate-btn"
                    onClick={() => handleTranslateReview(review)}
                    disabled={translateMap[review.id]?.loading}
                  >
                    <Languages size={13} />
                    {translateMap[review.id]?.loading
                      ? "Đang dịch..."
                      : translateMap[review.id]?.shown
                      ? "Ẩn bản dịch"
                      : "Dịch"}
                  </button>
                </div>
                {translateMap[review.id]?.shown && translateMap[review.id]?.text && (
                  <p className="rev-translated-text">🌐 {translateMap[review.id].text}</p>
                )}
              </div>
            ))
          ) : (
            <p className="no-reviews">Chưa có đánh giá nào. Hãy là người đầu tiên.</p>
          )}
        </div>
      </div>

      {/* Floating Route Button */}
      <button className="floating-route-btn" onClick={onOpenRoute} title="Tìm lộ trình đến địa điểm này">
        <Activity size={20} />
      </button>
    </div>
  );
}

function getAqiColorClass(value: number | null): string {
  if (value === null) return "aqi-unknown";
  if (value <= 50) return "aqi-good";
  if (value <= 100) return "aqi-moderate";
  if (value <= 150) return "aqi-sensitive";
  if (value <= 200) return "aqi-bad";
  return "aqi-very-bad";
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Vừa xong";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return "Vừa xong";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}
