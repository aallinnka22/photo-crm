import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Lightbox from "../components/Lightbox";
import {
  adminLogin,
  adminListGalleries,
  adminCreateGallery,
  adminGetGallery,
  adminUploadPhotos,
  adminDeletePhoto,
  adminDeleteGallery,
  adminSetPhotoStatus,
  getAvailability,
  adminListBookings,
  adminCreateBlock,
  adminDeleteBooking,
  adminListReviews,
  adminSetReviewStatus,
  adminDeleteReview,
} from "../api";

export default function AdminPage() {
  const [token, setToken] = useState(
    () => localStorage.getItem("adminToken") || "",
  );
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const [galleries, setGalleries] = useState([]);
  const [activeId, setActiveId] = useState("");

  const [create, setCreate] = useState({
    clientName: "",
    selectionLimit: 10,
  });

  const [newCode, setNewCode] = useState("");

  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  const active = useMemo(
    () => galleries.find((g) => g._id === activeId),
    [galleries, activeId],
  );
  const photos = active?.photos || [];
  const lbPhoto = photos[lbIndex];

  const selectedPhotos = useMemo(() => {
    const ids = new Set(active?.selectedPhotoIds || []);
    return (active?.photos || []).filter((p) => ids.has(p._id));
  }, [active]);

  const [slotDate, setSlotDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [slotAvail, setSlotAvail] = useState([]);
  const [slotBookings, setSlotBookings] = useState([]);
  const [slotBusy, setSlotBusy] = useState(false);
  const [slotMsg, setSlotMsg] = useState("");

  const [revStatusTab, setRevStatusTab] = useState("pending");
  const [revItems, setRevItems] = useState([]);
  const [revBusy, setRevBusy] = useState(false);
  const [revMsg, setRevMsg] = useState("");

function makeDate(dateStr, timeStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const [hh, mm] = String(timeStr).split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0);
}

function addMinutes(dateObj, minutes) {
  return new Date(dateObj.getTime() + minutes * 60 * 1000);
}

  async function load() {
    if (!token) return;
    try {
      const data = await adminListGalleries(token);
      const items = data.items || [];
      setGalleries(items);
      if (!activeId && items[0]?._id) setActiveId(items[0]._id);
    } catch (e) {
      setStatus(e.message);
      localStorage.removeItem("adminToken");
      setToken("");
    }
  }

  useEffect(() => {
    document.body.classList.add("admin");
    return () => document.body.classList.remove("admin");
  }, []);

  useEffect(() => {
    load();
    
  }, [token]);

  useEffect(() => {
    async function loadActive() {
      if (!token || !activeId) return;
      try {
        const data = await adminGetGallery(token, activeId);
        const fresh = data?.gallery;
        if (!fresh) return;

        setGalleries((prev) =>
          prev.map((g) => (g._id === activeId ? { ...g, ...fresh } : g)),
        );
      } catch (e) {
        setStatus(e.message);
      }
    }

    loadActive();
  }, [token, activeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      if (!token || !slotDate) return;

      setSlotBusy(true);
      setSlotMsg("");

      try {
        const [avail, book] = await Promise.all([
          getAvailability(slotDate),
          adminListBookings(token, slotDate),
        ]);

        if (cancelled) return;

        setSlotAvail(Array.isArray(avail?.slots) ? avail.slots : []);
        setSlotBookings(Array.isArray(book?.bookings) ? book.bookings : []);
      } catch (e) {
        if (!cancelled) {
          setSlotAvail([]);
          setSlotBookings([]);
          setSlotMsg(e?.message || "Помилка завантаження часу");
        }
      } finally {
        if (!cancelled) setSlotBusy(false);
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [token, slotDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      if (!token) return;

      setRevBusy(true);
      setRevMsg("");

      try {
        const data = await adminListReviews(token, revStatusTab);
        if (cancelled) return;
        setRevItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        if (!cancelled) setRevMsg(e.message);
      } finally {
        if (!cancelled) setRevBusy(false);
      }
    }

    loadReviews();
    return () => {
      cancelled = true;
    };
  }, [token, revStatusTab]);

  async function doLogin() {
    try {
      setStatus("Вхід...");
      const data = await adminLogin(password);
      localStorage.setItem("adminToken", data.token);
      setToken(data.token);
      setPassword("");
      setStatus("");
    } catch (e) {
      setStatus(e.message);
    }
  }

  function logout() {
    localStorage.removeItem("adminToken");
    setToken("");
    setStatus("");
    setGalleries([]);
    setActiveId("");
    setNewCode("");
    setLbOpen(false);
    setLbIndex(0);

    setSlotMsg("");
    setSlotAvail([]);
    setSlotBookings([]);

    setRevMsg("");
    setRevItems([]);
    setRevStatusTab("pending");
  }

  async function createGallery() {
    try {
      const data = await adminCreateGallery(token, create);
      setNewCode(data.accessCode);
      setCreate({ clientName: "", selectionLimit: 10 });
      await load();
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function uploadPhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeId) return;

    try {
      await adminUploadPhotos(token, activeId, files);
      await load();
      e.target.value = "";
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function removePhoto(photoId) {
    if (!activeId) return;
    try {
      await adminDeletePhoto(token, activeId, photoId);
      await load();
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function removeGallery(galleryId) {
    if (!token) return;
    if (!window.confirm("Видалити галерею разом з усіма фото?")) return;
    try {
      await adminDeleteGallery(token, galleryId);
      if (activeId === galleryId) setActiveId("");
      setNewCode("");
      setLbOpen(false);
      setLbIndex(0);
      await load();
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function setPhotoStatus(photoId, newStatus) {
    if (!activeId) return;
    try {
      await adminSetPhotoStatus(token, activeId, photoId, newStatus);
      await load();
    } catch (e) {
      setStatus(e.message);
    }
  }

  function openLightboxByPhotoId(photoId) {
    const idx = photos.findIndex((x) => x._id === photoId);
    setLbIndex(Math.max(0, idx));
    setLbOpen(true);
  }

  function closeLightbox() {
    setLbOpen(false);
  }

  function prevPhoto() {
    if (!photos.length) return;
    setLbIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  function nextPhoto() {
    if (!photos.length) return;
    setLbIndex((i) => (i + 1) % photos.length);
  }

  function hhmm(dateStrOrObj) {
    const d = new Date(dateStrOrObj);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function findBookingForSlot(timeStr) {
    return (slotBookings || []).find((b) => hhmm(b.startAt) === timeStr);
  }

  async function refreshSlots() {
    if (!token || !slotDate) return;
    const [avail, book] = await Promise.all([
      getAvailability(slotDate),
      adminListBookings(token, slotDate),
    ]);
    setSlotAvail(Array.isArray(avail?.slots) ? avail.slots : []);
    setSlotBookings(Array.isArray(book?.bookings) ? book.bookings : []);
  }

  async function toggleSlot(timeStr) {
    if (!token || !slotDate || !timeStr) return;

    const b = findBookingForSlot(timeStr);

    if (b && b.isBlock) {
      try {
        await adminDeleteBooking(token, b._id);
        await refreshSlots();
      } catch (e) {
        setSlotMsg(e?.message || "Помилка");
      }
      return;
    }

    if (b && !b.isBlock) {
      setSlotMsg("Цей час зайнятий бронюванням клієнта");
      return;
    }

    try {
      await adminCreateBlock(token, {
        date: slotDate,
        time: timeStr,
        duration: 60,
        reason: "Blocked by admin",
      });
      await refreshSlots();
    } catch (e) {
      setSlotMsg(e?.message || "Помилка");
    }
  }

  async function setReviewStatus(id, newStatus) {
    try {
    
      await adminSetReviewStatus(token, id, newStatus);

      const data = await adminListReviews(token, revStatusTab);
      setRevItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setRevMsg(e.message);
    }
  }

  async function removeReview(id) {
    if (!window.confirm("Видалити відгук?")) return;
    try {
     
      await adminDeleteReview(token, id);
 
      const data = await adminListReviews(token, revStatusTab);
      setRevItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setRevMsg(e.message);
    }
  }

  return (
    <>
      <header>
        <div className="container nav">
          <Link className="brand" to="/">
            <div className="logo" aria-hidden="true"></div>
            <h1>Alina Photographer</h1>
          </Link>

          {token ? (
            <button
              className="btn"
              type="button"
              onClick={logout}
              title="Вийти"
            >
              Вийти
            </button>
          ) : null}
        </div>
      </header>

      <main className="container admin-main">
        <section className="hero admin-hero">
          <div>
            <h2 className="title admin-title">Адмін-панель</h2>

            {status ? <div className="muted admin-status">{status}</div> : null}
          </div>

          {!token ? (
  <div className="card panel-card panel-card-top">
    <div className="stack">
      <strong>Вхід адміністратора</strong>
      <input
        className="input"
        type="password"
        placeholder="Admin password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn wide" type="button" onClick={doLogin}>
        Увійти
      </button>
      <div className="muted admin-login-hint"></div>
    </div>
  </div>
) : null}
        </section>

        {token ? (
          <section className="admin-section">
            <div className="panel-grid">
              <div className="card panel-card">
                <h3 className="admin-heading-reset">Створити галерею</h3>

                <div className="stack">
                  <input
                    className="input"
                    placeholder="Імʼя клієнта"
                    value={create.clientName}
                    onChange={(e) =>
                      setCreate({ ...create, clientName: e.target.value })
                    }
                  />

                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="200"
                    placeholder="Ліміт вибору (1..200)"
                    value={create.selectionLimit}
                    onChange={(e) =>
                      setCreate({
                        ...create,
                        selectionLimit: Number(e.target.value),
                      })
                    }
                  />

                  <button
                    className="btn wide"
                    type="button"
                    onClick={createGallery}
                  >
                    Створити
                  </button>

                  {newCode ? (
                    <div className="card admin-new-code-card">
                      <div className="muted admin-new-code-label">
                        Код доступу:
                      </div>
                      <div className="admin-new-code-value">{newCode}</div>
                      <button
                        type="button"
                        className="btn admin-copy-btn"
                        onClick={() => navigator.clipboard.writeText(newCode)}
                      >
                        Копіювати
                      </button>
                    </div>
                  ) : null}
                </div>

                <hr className="sep admin-sep-sm" />

                <h3 className="admin-heading-reset">Галереї</h3>
                <div className="stack admin-scroll-420">
                  {galleries.map((g) => (
                    <div
                      key={g._id}
                      className="card admin-gallery-card"
                      style={{
                        border:
                          g._id === activeId
                            ? "2px solid rgba(143, 176, 255, 0.55)"
                            : "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveId(g._id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" ? setActiveId(g._id) : null
                        }
                        className="admin-gallery-main"
                      >
                        <div className="admin-gallery-name">
                          {g.clientName || "Без імені"}
                        </div>
                        <div className="muted admin-gallery-slug">{g.slug}</div>
                      </div>

                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => removeGallery(g._id)}
                        title="Видалити галерею"
                        aria-label="Видалити галерею"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  {!galleries.length ? (
                    <div className="muted">Поки що немає галерей.</div>
                  ) : null}
                </div>

                <hr className="sep admin-sep-md" />

                <h3 className="admin-heading-reset"></h3>

                <div className="stack">
                  <div>
                    <div className="muted admin-meta-label">Дата</div>
                    <input
                      className="input"
                      type="date"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                    />
                  </div>

                  <div className="muted admin-meta-text">
                    
                  </div>

                  <div className="card admin-slot-box">
                    <div className="admin-slot-list">
                    {(slotAvail || []).map((s) => {
const slotStart = makeDate(slotDate, s.time);
  const slotEnd = addMinutes(slotStart, 60);

 
 const b = slotBookings?.find((bk) => {
  return (
    slotStart < new Date(bk.endAt) &&
    slotEnd > new Date(bk.startAt)
  );
});

  const kind = b
    ? (b.isBlock ? "blocked" : "booked")
    : "free";

  return (
    <button
      key={s.time}
      type="button"
      className="btn"
      disabled={slotBusy || kind === "booked"}
      onClick={() => toggleSlot(s.time)}
      title={
        kind === "free"
          ? "Вільний — натисни, щоб заблокувати"
          : kind === "blocked"
            ? "Заблоковано — натисни, щоб розблокувати"
            : "Зайнято бронюванням клієнта"
      }
      style={{
        padding: "8px 10px",
        opacity: slotBusy
          ? 0.6
          : kind === "booked"
            ? 0.35
            : 1,
        cursor: slotBusy
          ? "wait"
          : kind === "booked"
            ? "not-allowed"
            : "pointer",
        border:
          kind === "free"
            ? "2px solid rgba(143, 176, 255, 0.55)"
            : kind === "blocked"
              ? "2px solid rgba(245, 27, 11, 0.85)"
              : "1px solid rgba(255,255,255,0.12)",
        background: "transparent",
      }}
    >
      {s.time}
    </button>
  );
})}
                    </div>

                    {slotMsg ? (
                      <div className="muted admin-slot-message">{slotMsg}</div>
                    ) : null}

                    {!slotBusy && !slotAvail?.length ? (
                      <div className="muted admin-slot-message">
                        Немає слотів для цієї дати.
                      </div>
                    ) : null}

                    <div className="muted admin-slot-legend">
                      <span>🔵 Вільно</span>
                      <span>🔴 Заблоковано адміном</span>
                      <span>⚫️ Зайнято клієнтом</span>
                    </div>
                  </div>
                </div>

                <hr className="sep admin-sep-md" />
                <h3 className="admin-heading-reset">Відгуки клієнтів</h3>

                <div className="tabs admin-tabs-gap">
                  <button
                    className={`tab ${revStatusTab === "pending" ? "active" : ""}`}
                    type="button"
                    onClick={() => setRevStatusTab("pending")}
                  >
                    В очікуванні
                  </button>
                  <button
                    className={`tab ${revStatusTab === "approved" ? "active" : ""}`}
                    type="button"
                    onClick={() => setRevStatusTab("approved")}
                  >
                    Підтверджені
                  </button>
                  <button
                    className={`tab ${revStatusTab === "rejected" ? "active" : ""}`}
                    type="button"
                    onClick={() => setRevStatusTab("rejected")}
                  >
                    Відхилені
                  </button>
                </div>

                {revMsg ? (
                  <div className="muted admin-rev-msg">{revMsg}</div>
                ) : null}

                <div className="stack admin-scroll-360">
                 {(revItems || []).map((r) => (
  <div key={r._id} className="card admin-review-card">
    <div
      style={{
        display: "grid",
        gridTemplateColumns: r.photoUrl ? "72px 1fr" : "1fr",
        gap: "14px",
        alignItems: "start",
      }}
    >
      {r.photoUrl ? (
        <img
          src={r.photoUrl}
          alt={r.name || "review"}
          loading="lazy"
          style={{
            width: "72px",
            height: "72px",
            objectFit: "cover",
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        />
      ) : null}

      <div>
        <div className="admin-review-head">
          <div className="admin-review-meta">
            <div className="admin-review-name">
              {r.name}{" "}
              <span className="muted admin-review-rating">
                ({r.rating}/5)
              </span>
            </div>

            {r.shootType ? (
              <div className="muted admin-review-subtext">
                Тип зйомки: {r.shootType}
              </div>
            ) : null}

            {r.contact ? (
              <div className="muted admin-review-subtext">{r.contact}</div>
            ) : null}

            {r.createdAt ? (
              <div className="muted admin-review-subtext">
                {new Date(r.createdAt).toLocaleString()}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={() => removeReview(r._id)}
            title="Видалити"
          >
            🗑️
          </button>
        </div>

        <div className="muted admin-review-text">{r.text}</div>

        {Array.isArray(r.features) && r.features.length ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "12px",
            }}
          >
            {r.features.map((f, i) => (
              <span
                key={`${r._id}-${f}-${i}`}
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  fontSize: "14px",
                }}
              >
                ✓ {f}
              </span>
            ))}
          </div>
        ) : null}

        {r.status === "pending" ? (
  <div className="admin-review-actions">
    <button
      className="btn"
      type="button"
      disabled={revBusy}
      onClick={() => setReviewStatus(r._id, "approved")}
    >
      Підтвердити
    </button>
    <button
      className="btn"
      type="button"
      disabled={revBusy}
      onClick={() => setReviewStatus(r._id, "rejected")}
    >
      Відхилити
    </button>
  </div>
) : null}
      </div>
    </div>
  </div>
))}
                  {!revBusy && !revItems.length ? (
                    <div className="muted">Поки що порожньо.</div>
                  ) : null}
                </div>
              </div>

              <div className="card panel-card">
                <div className="section-head">
                  <div>
                    <h3 className="admin-section-title-reset">Фото галереї</h3>
                    <div className="muted admin-gallery-meta">
                      Клієнт: <b>{active?.clientName || "—"}</b> | Ліміт:{" "}
                      <b>{active?.selectionLimit || 10}</b> | Фото:{" "}
                      <b>{active?.photos?.length || 0}</b> | Лайкнуто:{" "}
                      <b>{active?.selectedPhotoIds?.length || 0}</b>
                    </div>
                  </div>

                  <div className="file-row">
                    <label
                      className="btn"
                      style={{
                        cursor: activeId ? "pointer" : "not-allowed",
                        opacity: activeId ? 1 : 0.5,
                      }}
                    >
                      Вибрати файли
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={uploadPhotos}
                        disabled={!activeId}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                {!activeId ? (
                  <div className="muted admin-empty-block"></div>
                ) : (
                  <>
                    <div className="thumb-grid">
                      {(active?.photos || []).map((p) => {
                        const liked = (active?.selectedPhotoIds || []).includes(
                          p._id,
                        );
                        return (
                          <div
                            key={p._id}
                            className="thumb admin-thumb"
                          >
                            {liked ? (
                              <div
                                title="Лайк клієнта"
                                className="admin-heart-badge"
                              >
                                ❤️
                              </div>
                            ) : null}

                            <img
                              src={p.url}
                              alt={p.filename || "photo"}
                              loading="lazy"
                              className="admin-zoomable-img"
                              onClick={() => openLightboxByPhotoId(p._id)}
                            />

                            <div className="admin-thumb-body">
                              <div className="muted admin-meta-label">
                                Статус:
                              </div>

                              <select
                                value={p.status || "preview"}
                                onChange={(e) =>
                                  setPhotoStatus(p._id, e.target.value)
                                }
                                className="admin-photo-select"
                              >
                                <option value="preview">
                                  Для відбору ретуші
                                </option>
                                <option value="final">Остаточні</option>
                              </select>

                              <div
                                className="muted admin-photo-status-pill"
                                style={{
                                  border:
                                    (p.status || "preview") === "final"
                                      ? "1px solid rgba(255,255,255,0.22)"
                                      : "1px solid rgba(255,255,255,0.14)",
                                  background:
                                    (p.status || "preview") === "final"
                                      ? "rgba(255,255,255,0.08)"
                                      : "rgba(255,255,255,0.06)",
                                }}
                              >
                                {(p.status || "preview") === "final"
                                  ? "Фінальне (можна завантажувати)"
                                  : "Превʼю (для вибору)"}
                              </div>
                            </div>

                            <div className="thumb-foot">
                              <div className="muted admin-thumb-file">
                                {p.filename || p.publicId}
                              </div>
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => removePhoto(p._id)}
                                title="Видалити"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!active?.photos?.length ? (
                      <div className="muted admin-empty-block">
                        Поки що фото не завантажені.
                      </div>
                    ) : null}

                    <div className="admin-selected-wrap">
                      <h3 className="admin-selected-title">Вибір клієнта</h3>

                      <div className="muted admin-selected-count">
                        Обрано: <b>{active?.selectedPhotoIds?.length || 0}</b> /{" "}
                        <b>{active?.selectionLimit || 10}</b>
                      </div>

                      <div className="admin-comment-wrap">
                        <div className="muted admin-meta-label">
                          Коментар клієнта:
                        </div>
                        <div className="admin-comment-box">
                          {active?.comment?.trim() ? (
                            active.comment
                          ) : (
                            <span className="muted">Немає</span>
                          )}
                        </div>
                      </div>

                      {selectedPhotos.length === 0 ? (
                        <div className="muted">Клієнт ще нічого не обрав.</div>
                      ) : (
                        <div className="thumb-grid">
                          {selectedPhotos.map((p) => (
                            <div
                              key={p._id}
                              className="thumb admin-thumb admin-thumb-selected"
                            >
                              <div
                                title="Вибір клієнта"
                                className="admin-heart-badge"
                              >
                                ❤️
                              </div>

                              <img
                                src={p.url}
                                alt={p.filename || "selected"}
                                loading="lazy"
                                className="admin-zoomable-img"
                                onClick={() => openLightboxByPhotoId(p._id)}
                              />

                              <div className="thumb-foot">
                                <div className="muted admin-thumb-file admin-thumb-file-full">
                                  {p.filename || p.publicId}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="muted admin-bottom-note"></div>
                  </>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <Lightbox
        isOpen={lbOpen}
        src={lbPhoto?.url}
        title={lbPhoto?.filename || lbPhoto?.publicId}
        onClose={closeLightbox}
        onPrev={prevPhoto}
        onNext={nextPhoto}
      />
    </>
  );
}