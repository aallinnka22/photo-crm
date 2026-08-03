const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";

// Базова обгортка для fetch запитів із підтримкою Cookies
async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "include", // Обов'язково для роботи з HTTP Cookies (cross-site Vercel <-> Render)
  });

  const rawText = await res.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { message: rawText };
  }

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// ==================== ДОСТУПНІСТЬ ТА БРОНЮВАННЯ ====================

export async function getAvailability(date) {
  return fetchJson(
    `${API_BASE}/bookings/availability?date=${encodeURIComponent(date)}`
  );
}

export async function createBooking(data) {
  return fetchJson(`${API_BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ==================== КЛІЄНТСЬКА ГАЛЕРЕЯ ====================

export async function clientLogin(code) {
  return fetchJson(`${API_BASE}/galleries/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export async function getMyGallery() {
  return fetchJson(`${API_BASE}/galleries/me/photos`);
}

export async function saveMySelection(payload) {
  return fetchJson(`${API_BASE}/galleries/me/selection`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

// ==================== АДМІНІСТРУВАННЯ ====================

export async function adminLogin(password) {
  return fetchJson(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

export async function adminListGalleries() {
  return fetchJson(`${API_BASE}/admin/galleries`);
}

export async function adminCreateGallery(payload) {
  return fetchJson(`${API_BASE}/admin/galleries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function adminGetGallery(galleryId) {
  return fetchJson(`${API_BASE}/admin/galleries/${galleryId}`);
}

export async function adminUploadPhotos(galleryId, files) {
  const fd = new FormData();
  for (const f of files) fd.append("photos", f);

  const res = await fetch(`${API_BASE}/admin/galleries/${galleryId}/photos`, {
    method: "POST",
    credentials: "include", // Обов'язково для FormData
    body: fd,
  });

  const rawText = await res.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { message: rawText };
  }

  if (!res.ok)
    throw new Error(data?.message || `Upload failed (${res.status})`);
  return data;
}

export async function adminDeleteGallery(galleryId) {
  return fetchJson(`${API_BASE}/admin/galleries/${galleryId}`, {
    method: "DELETE",
  });
}

export async function adminDeletePhoto(galleryId, photoId) {
  return fetchJson(
    `${API_BASE}/admin/galleries/${galleryId}/photos/${photoId}`,
    {
      method: "DELETE",
    }
  );
}

export async function adminSetPhotoStatus(galleryId, photoId, status) {
  return fetchJson(
    `${API_BASE}/admin/galleries/${galleryId}/photos/${photoId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );
}

// ==================== АДМІН: БРОНЮВАННЯ ====================

export async function adminListBookings(date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return fetchJson(`${API_BASE}/bookings${q}`);
}

export async function adminCreateBlock(payload) {
  return fetchJson(`${API_BASE}/bookings/block`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateBooking(id, payload) {
  return fetchJson(`${API_BASE}/bookings/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteBooking(id) {
  return fetchJson(`${API_BASE}/bookings/${id}`, {
    method: "DELETE",
  });
}

// ==================== ВІДГУКИ ====================

export async function getReviews(limit = 20) {
  return fetchJson(`${API_BASE}/reviews?limit=${encodeURIComponent(limit)}`);
}

export async function createReview(payload) {
  return fetchJson(`${API_BASE}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function adminListReviews(status = "pending") {
  return fetchJson(
    `${API_BASE}/admin/reviews?status=${encodeURIComponent(status)}`
  );
}

export async function adminSetReviewStatus(id, status) {
  return fetchJson(`${API_BASE}/admin/reviews/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
}

export async function adminDeleteReview(id) {
  return fetchJson(`${API_BASE}/admin/reviews/${id}`, {
    method: "DELETE",
  });
}

// Вихід для адміна
export async function adminLogout() {
  return fetchJson(`${API_BASE}/admin/logout`, {
    method: "POST",
  });
}

// Вихід для клієнта галереї
export async function clientLogout() {
  return fetchJson(`${API_BASE}/galleries/logout`, {
    method: "POST",
  });
}