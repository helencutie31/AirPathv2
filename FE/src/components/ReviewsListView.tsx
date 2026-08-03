import { ChevronLeft, Star, Filter, Languages } from "lucide-react";
import { useState } from "react";
import type { LocationReview } from "@/lib/types";
import { translateReviewContent } from "@/lib/api";
import { getAvatarPreset, getAvatarSelectionStyle, type AvatarSelection } from "@/lib/avatar-presets";
import "../styles/demo-reviews.css";

type Props = {
  locationName: string;
  reviews: LocationReview[];
  onBack: () => void;
  reviewsLoading?: boolean;
  reviewsError?: string | null;
  currentUserId?: string;
  currentUserAvatarSelection?: AvatarSelection;
};

export function ReviewsListView({
  locationName,
  reviews,
  onBack,
  reviewsLoading = false,
  reviewsError,
  currentUserId,
  currentUserAvatarSelection,
}: Props) {
  const [sortBy, setSortBy] = useState<"recent" | "rating-high" | "rating-low">("recent");
  const [translateMap, setTranslateMap] = useState<Record<string, { text: string; loading: boolean; shown: boolean }>>({});

  async function handleTranslateReview(review: LocationReview) {
    const existing = translateMap[review.id];
    if (existing?.shown) {
      setTranslateMap((prev) => ({ ...prev, [review.id]: { ...existing, shown: false } }));
      return;
    }
    if (existing?.text) {
      setTranslateMap((prev) => ({ ...prev, [review.id]: { ...existing, shown: true } }));
      return;
    }
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

  // Calculate statistics
  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const ratingDistribution = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  const maxCount = Math.max(...Object.values(ratingDistribution)) || 1;

  // Sort reviews
  let sortedReviews = [...reviews];
  if (sortBy === "recent") {
    sortedReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sortBy === "rating-high") {
    sortedReviews.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === "rating-low") {
    sortedReviews.sort((a, b) => a.rating - b.rating);
  }

  return (
    <div className="demo-reviews-container">
      {/* Header */}
      <header className="reviews-header">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="header-title">{locationName}</h2>
        <div className="header-spacer"></div>
      </header>

      {/* Main Content */}
      <main className="reviews-scrollable-content">
        {/* Rating Summary */}
        <div className="rating-summary-box">
          <div className="big-score">{averageRating}</div>
          <div className="stars-display">
            {Array(Math.round(Number(averageRating)))
              .fill(0)
              .map((_, i) => (
                <Star key={i} size={18} fill="#ffc107" color="#ffc107" />
              ))}
            {Array(5 - Math.round(Number(averageRating)))
              .fill(0)
              .map((_, i) => (
                <Star key={i + 5} size={18} color="#ddd" />
              ))}
          </div>
          <div className="total-reviews-count">Tổng cộng {reviews.length} Đánh giá</div>
        </div>

        {/* Distribution Graph */}
        <div className="distribution-graph-card">
          {[5, 4, 3, 2, 1].map((stars) => (
            <div key={stars} className="graph-row">
              <span className="star-label">{stars}</span>
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{ width: `${(ratingDistribution[stars as keyof typeof ratingDistribution] / maxCount) * 100}%` }}
                />
              </div>
              <span className="bar-count">{ratingDistribution[stars as keyof typeof ratingDistribution]}</span>
            </div>
          ))}
        </div>

        {/* List Header with Sort */}
        <div className="list-header-row">
          <span className="list-title">Đánh giá</span>
          <select
            className="sort-dropdown-btn"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "rating-high" | "rating-low")}
          >
            <option value="recent">📅 Mới nhất</option>
            <option value="rating-high">⭐ Điểm cao nhất</option>
            <option value="rating-low">⭐ Điểm thấp nhất</option>
          </select>
        </div>

        {/* Reviews List */}
        <div className="all-reviews-list">
          {reviewsError && <div className="no-reviews-message"><p>{reviewsError}</p></div>}
          {reviewsLoading ? (
            <div className="no-reviews-message">
              <p>Đánh giáĐang tải...</p>
            </div>
          ) : sortedReviews.length > 0 ? (
            sortedReviews.map((review) => (
              <div key={review.id} className="review-card-full">
                <div className="review-header-row">
                  {review.user_id === currentUserId && currentUserAvatarSelection ? (
                    <span className="review-avatar review-avatar-custom" style={getAvatarSelectionStyle(currentUserAvatarSelection)}>
                      <img
                        src={getAvatarPreset(currentUserAvatarSelection.avatarId).src}
                        alt="Ảnh đại diện của bạn"
                        onError={(event) => {
                          event.currentTarget.src = getAvatarPreset(currentUserAvatarSelection.avatarId).fallbackSrc;
                        }}
                      />
                    </span>
                  ) : (
                    <span className="review-avatar">{review.author.slice(0, 1).toUpperCase()}</span>
                  )}
                  <div className="review-meta">
                    <h5 className="review-author">{review.author}</h5>
                    <div className="review-rating">
                      {Array(review.rating)
                        .fill(0)
                        .map((_, i) => (
                          <Star key={i} size={12} fill="#ffc107" color="#ffc107" />
                        ))}
                      {Array(5 - review.rating)
                        .fill(0)
                        .map((_, i) => (
                          <Star key={i + 5} size={12} color="#ddd" />
                        ))}
                    </div>
                  </div>
                  <span className="review-date">{formatRelativeTime(review.created_at)}</span>
                </div>
                <p className="review-body">"{review.content}"</p>
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
                {review.helpful_count > 0 && (
                  <div className="review-footer">
                  <button className="helpful-btn">👍 Hữu ích ({review.helpful_count})</button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-reviews-message">
              <p>Đánh giá</p>
              <small>Hãy là người đầu tiên chia sẻ trải nghiệm.</small>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Vừa xong";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return "Vừa xong";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} phút`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} Thời gian`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} `;
}
