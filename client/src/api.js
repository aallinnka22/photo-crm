const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";


async function fetchJson(url, options) {
  const res = await fetch(url, options);

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


export async function getAvailability(date) {
  return fetchJson(
    `${API_BASE}/bookings/availability?date=${encodeURIComponent(date)}`,
  );
}

export async function createBooking(data) {
  return fetchJson(`${API_BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}


export async function clientLogin(code) {
  return fetchJson(`${API_BASE}/galleries/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export async function getMyGallery(token) {
  return fetchJson(`${API_BASE}/galleries/me/photos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function saveMySelection(token, payload) {
  return fetchJson(`${API_BASE}/galleries/me/selection`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}


export async function adminLogin(password) {
  return fetchJson(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

export async function adminListGalleries(token) {
  return fetchJson(`${API_BASE}/admin/galleries`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminCreateGallery(token, payload) {
  return fetchJson(`${API_BASE}/admin/galleries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function adminGetGallery(token, galleryId) {
  return fetchJson(`${API_BASE}/admin/galleries/${galleryId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminUploadPhotos(token, galleryId, files) {
  const fd = new FormData();
  for (const f of files) fd.append("photos", f);

  const res = await fetch(`${API_BASE}/admin/galleries/${galleryId}/photos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
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

export async function adminDeleteGallery(token, galleryId) {
  return fetchJson(`${API_BASE}/admin/galleries/${galleryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminDeletePhoto(token, galleryId, photoId) {
  return fetchJson(
    `${API_BASE}/admin/galleries/${galleryId}/photos/${photoId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export async function adminSetPhotoStatus(token, galleryId, photoId, status) {
  return fetchJson(
    `${API_BASE}/admin/galleries/${galleryId}/photos/${photoId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    },
  );
}


export async function adminListBookings(token, date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return fetchJson(`${API_BASE}/bookings${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminCreateBlock(token, payload) {
  return fetchJson(`${API_BASE}/bookings/block`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateBooking(token, id, payload) {
  return fetchJson(`${API_BASE}/bookings/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteBooking(token, id) {
  return fetchJson(`${API_BASE}/bookings/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}


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


export async function adminListReviews(token, status = "pending") {
  return fetchJson(
    `${API_BASE}/admin/reviews?status=${encodeURIComponent(status)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export async function adminSetReviewStatus(token, id, status) {
  return fetchJson(`${API_BASE}/admin/reviews/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
}

export async function adminDeleteReview(token, id) {
  return fetchJson(`${API_BASE}/admin/reviews/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
