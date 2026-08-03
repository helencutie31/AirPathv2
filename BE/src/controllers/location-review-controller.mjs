import { sql } from "../db.mjs";
import { assert, isNonEmptyString } from "../utils/validation.mjs";

function normalizeAuthor(row) {
  const fullName = typeof row.full_name === "string" ? row.full_name.trim() : "";
  const emailPrefix = typeof row.email === "string" ? row.email.split("@")[0]?.trim() : "";

  return fullName || emailPrefix || "Ẩn danh";
}

function toReview(row) {
  return {
    id: row.id,
    location_id: row.location_id,
    location_name: row.location_name ?? null,
    user_id: row.user_id,
    author: normalizeAuthor(row),
    rating: Number(row.rating),
    content: row.content,
    helpful_count: Number(row.helpful_count ?? 0),
    is_hidden: Boolean(row.is_hidden),
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: row.metadata ?? {},
  };
}

export async function listLocationReviewsController(locationId) {
  const reviews = await sql`
    select
      lr.id,
      lr.location_id,
      lr.user_id,
      lr.rating,
      lr.content,
      lr.helpful_count,
      lr.is_hidden,
      lr.created_at,
      lr.updated_at,
      lr.metadata,
      u.full_name,
      u.email
    from airpath.location_reviews lr
    join airpath.users u on u.id = lr.user_id
    where lr.location_id = ${locationId}
      and lr.is_hidden = false
    order by lr.created_at desc
    limit 100
  `;

  return { reviews: reviews.map(toReview) };
}

export async function createLocationReviewController(locationId, body) {
  assert(isNonEmptyString(body.userId), "userId is required.");
  assert(isNonEmptyString(body.content), "content is required.");

  const rating = Number(body.rating);
  assert(Number.isInteger(rating) && rating >= 1 && rating <= 5, "rating must be between 1 and 5.");

  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
  const isHidden = body.is_hidden === true || body.is_hidden === "true" ? true : false;

  const [review] = await sql`
    insert into airpath.location_reviews (
      location_id,
      user_id,
      rating,
      content,
      metadata,
      is_hidden
    ) values (
      ${locationId},
      ${body.userId.trim()},
      ${rating},
      ${body.content.trim()},
      ${JSON.stringify(metadata)}::jsonb,
      ${isHidden}
    )
    returning id, location_id, user_id, rating, content, helpful_count, is_hidden, created_at, updated_at, metadata
  `;

  // If review is hidden (flagged), create a notification for the author informing them
  if (isHidden) {
    try {
      await sql`
        insert into airpath.notifications (
          user_id,
          type,
          title,
          description
        ) values (
          ${body.userId.trim()},
          'system',
          'Bình luận của bạn đang chờ kiểm duyệt',
          ${`Nội dung: ${body.content.trim()}`}
        )
      `;
    } catch (err) {
      // non-fatal
      console.error('Failed to create notification for flagged review', err);
    }
  }

  const [authorRow] = await sql`
    select
      u.full_name,
      u.email
    from airpath.users u
    where u.id = ${review.user_id}
  `;

  return {
    review: {
      ...toReview({ ...review, ...(authorRow ?? {}) }),
    },
  };
}

export async function listHiddenLocationReviewsController() {
  const rows = await sql`
    select
      lr.id,
      lr.location_id,
      l.name as location_name,
      lr.user_id,
      lr.rating,
      lr.content,
      lr.helpful_count,
      lr.is_hidden,
      lr.created_at,
      lr.updated_at,
      lr.metadata,
      u.full_name,
      u.email
    from airpath.location_reviews lr
    join airpath.users u on u.id = lr.user_id
    left join airpath.locations l on l.id = lr.location_id
    where lr.is_hidden = true
    order by lr.created_at desc
    limit 200
  `;

  return { reviews: rows.map(toReview) };
}

export async function updateLocationReviewController(reviewId, body) {
  const fields = [];
  if (body.is_hidden !== undefined) {
    fields.push(sql`is_hidden = ${Boolean(body.is_hidden)}`);
  }
  if (body.metadata !== undefined) {
    // replace metadata entirely with provided object
    fields.push(sql`metadata = ${JSON.stringify(body.metadata)}::jsonb`);
  }

  if (fields.length === 0) {
    throw new Error('No updatable fields provided.');
  }

  // Run specific update queries for provided fields.
  let updatedRow = null;
  if (body.is_hidden !== undefined && body.metadata !== undefined) {
    const [u] = await sql`
      update airpath.location_reviews
      set is_hidden = ${Boolean(body.is_hidden)}, metadata = ${JSON.stringify(body.metadata)}::jsonb, updated_at = ${new Date().toISOString()}
      where id = ${reviewId}
      returning id, location_id, user_id, rating, content, helpful_count, is_hidden, created_at, updated_at, metadata
    `;
    updatedRow = u;
  } else if (body.is_hidden !== undefined) {
    const [u] = await sql`
      update airpath.location_reviews
      set is_hidden = ${Boolean(body.is_hidden)}, updated_at = ${new Date().toISOString()}
      where id = ${reviewId}
      returning id, location_id, user_id, rating, content, helpful_count, is_hidden, created_at, updated_at, metadata
    `;
    updatedRow = u;
  } else if (body.metadata !== undefined) {
    const [u] = await sql`
      update airpath.location_reviews
      set metadata = ${JSON.stringify(body.metadata)}::jsonb, updated_at = ${new Date().toISOString()}
      where id = ${reviewId}
      returning id, location_id, user_id, rating, content, helpful_count, is_hidden, created_at, updated_at, metadata
    `;
    updatedRow = u;
  }

  const updated = updatedRow;

  if (!updated) throw new Error('Review not found');

  return { review: toReview(updated) };
}

export async function deleteLocationReviewController(reviewId) {
  const [deleted] = await sql`
    delete from airpath.location_reviews
    where id = ${reviewId}
    returning id
  `;
  if (!deleted) throw new Error('Review not found');
  return { id: deleted.id };
}
