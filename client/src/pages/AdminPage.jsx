import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Lightbox from "../components/Lightbox";
import {
  adminLogin,
  adminListGalleries,
  adminCreateGallery,
  adminGetGallery, // ✅ ДОДАНО
  adminUploadPhotos,
  adminDeletePhoto,
  adminDeleteGallery,
  adminSetPhotoStatus,

  // ✅ ДОДАНО: керування слотами
  getAvailability,
  adminListBookings,
  adminCreateBlock,
  adminDeleteBooking,

  // ✅ ДОДАНО: REVIEWS moderation
  adminListReviews,
  adminSetReviewStatus,
  adminDeleteReview,
} from "../api";

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const [galleries, setGalleries] = useState([]);
  const [activeId, setActiveId] = useState("");

  const [create, setCreate] = useState({
    clientName: "",
    selectionLimit: 10,
  });

  const [newCode, setNewCode] = useState("");

  // Lightbox
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  const active = useMemo(() => galleries.find((g) => g._id === activeId), [galleries, activeId]);
  const photos = active?.photos || [];
  const lbPhoto = photos[lbIndex];

  // ✅ Вибрані клієнтом фото як окремий список
  const selectedPhotos = useMemo(() => {
    const ids = new Set(active?.selectedPhotoIds || []);
    return (active?.photos || []).filter((p) => ids.has(p._id));
  }, [active]);

  // ✅ СЛОТИ (АДМІН)
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slotAvail, setSlotAvail] = useState([]); // [{time,isFree}]
  const [slotBookings, setSlotBookings] = useState([]); // bookings for date
  const [slotBusy, setSlotBusy] = useState(false);
  const [slotMsg, setSlotMsg] = useState("");

  // ✅ REVIEWS (АДМІН) — ДОДАНО
  const [revStatusTab, setRevStatusTab] = useState("pending");
  const [revItems, setRevItems] = useState([]);
  const [revBusy, setRevBusy] = useState(false);
  const [revMsg, setRevMsg] = useState("");

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

  // Mark admin page (useful for CSS overrides)
  useEffect(() => {
    document.body.classList.add("admin");
    return () => document.body.classList.remove("admin");
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ✅ ПІДТЯГУЄМО АКТИВНУ ГАЛЕРЕЮ (ЩОБ МАТИ selectedPhotoIds + comment)
  useEffect(() => {
    async function loadActive() {
      if (!token || !activeId) return;
      try {
        const data = await adminGetGallery(token, activeId);
        const fresh = data?.gallery;

        if (!fresh) return;

        // заливаємо дані активної галереї в state
        setGalleries((prev) => prev.map((g) => (g._id === activeId ? { ...g, ...fresh } : g)));
      } catch (e) {
        // не валимо сторінку, просто покажемо статус
        setStatus(e.message);
      }
    }

    loadActive();
  }, [token, activeId]);

  // ✅ ПІДТЯГУЄМО СЛОТИ ДЛЯ АДМІНА
  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      if (!token || !slotDate) return;

      setSlotBusy(true);
      setSlotMsg("");

      try {
        const [avail, book] = await Promise.all([getAvailability(slotDate), adminListBookings(token, slotDate)]);

        if (cancelled) return;

        setSlotAvail(Array.isArray(avail?.slots) ? avail.slots : []);
        setSlotBookings(Array.isArray(book?.bookings) ? book.bookings : []);
      } catch (e) {
        if (!cancelled) {
          setSlotAvail([]);
          setSlotBookings([]);
          setSlotMsg(e?.message || "Помилка завантаження слотів");
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

  // ✅ ПІДТЯГУЄМО REVIEWS ДЛЯ АДМІНА — ДОДАНО
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

    // slots state reset
    setSlotMsg("");
    setSlotAvail([]);
    setSlotBookings([]);

    // reviews reset
    setRevMsg("");
    setRevItems([]);
    setRevStatusTab("pending");
  }

  async function createGallery() {
    try {
      setStatus("Створення...");
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

  // ====== helpers for slots ======
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
    const [avail, book] = await Promise.all([getAvailability(slotDate), adminListBookings(token, slotDate)]);
    setSlotAvail(Array.isArray(avail?.slots) ? avail.slots : []);
    setSlotBookings(Array.isArray(book?.bookings) ? book.bookings : []);
  }

  async function toggleSlot(timeStr) {
    if (!token || !slotDate || !timeStr) return;

    const b = findBookingForSlot(timeStr);

    // якщо це block — видаляємо (розблок)
    if (b && b.isBlock) {
      try {
        await adminDeleteBooking(token, b._id);
        await refreshSlots();
      } catch (e) {
        setSlotMsg(e?.message || "Помилка");
      }
      return;
    }

    // якщо зайнято клієнтом — не чіпаємо
    if (b && !b.isBlock) {
      setSlotMsg("Цей слот зайнятий бронюванням клієнта");
      return;
    }

    // інакше — створюємо блок
    try {
      setSlotMsg("Блокую...");
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

  // ✅ REVIEWS handlers — ДОДАНО
  async function setReviewStatus(id, newStatus) {
    try {
      setRevMsg("Оновлення...");
      await adminSetReviewStatus(token, id, newStatus);
      setRevMsg("✅ Оновлено");
      const data = await adminListReviews(token, revStatusTab);
      setRevItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setRevMsg(e.message);
    }
  }

  async function removeReview(id) {
    if (!window.confirm("Видалити відгук?")) return;
    try {
      setRevMsg("Видалення...");
      await adminDeleteReview(token, id);
      setRevMsg("✅ Видалено");
      const data = await adminListReviews(token, revStatusTab);
      setRevItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setRevMsg(e.message);
    }
  }

  return (
    <>
      {/* NOTE: Removed decorative layers to avoid horizontal overflow on admin pages */}
      {/* <div className="waves" aria-hidden="true"></div> */}
      {/* <div className="noise" aria-hidden="true"></div> */}

      <header>
        <div className="container nav">
          <Link className="brand" to="/">
            <div className="logo" aria-hidden="true"></div>
            <h1>Alina Photographer</h1>
          </Link>

          {token ? (
            <button className="btn" type="button" onClick={logout} title="Вийти">
              Вийти
            </button>
          ) : null}
        </div>
      </header>

      <main className="container" style={{ paddingBottom: 40, overflowX: "hidden" }}>
        <section className="hero" style={{ paddingTop: 18 }}>
          <div>
            <h2 className="title" style={{ marginBottom: 10 }}>
              Адмін-панель
            </h2>


            {status ? (
              <div className="muted" style={{ marginTop: 10 }}>
                {status}
              </div>
            ) : null}
          </div>

          {!token ? (
            <div className="card panel-card" style={{ alignSelf: "start" }}>
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
                <div className="muted" style={{ fontSize: 12 }}></div>
              </div>
            </div>
          ) : (
            <div className="card panel-card" style={{ alignSelf: "start" }}>
              <div className="stack">
             
               
              </div>
            </div>
          )}
        </section>

        {token ? (
          <section style={{ marginTop: 10 }}>
            <div className="panel-grid">
              {/* LEFT */}
              <div className="card panel-card">
                <h3 style={{ marginTop: 0 }}>Створити клієнта/галерею</h3>

                <div className="stack">
                  <input
                    className="input"
                    placeholder="Імʼя клієнта"
                    value={create.clientName}
                    onChange={(e) => setCreate({ ...create, clientName: e.target.value })}
                  />

                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="200"
                    placeholder="Ліміт вибору (1..200)"
                    value={create.selectionLimit}
                    onChange={(e) => setCreate({ ...create, selectionLimit: Number(e.target.value) })}
                  />

                  <button className="btn wide" type="button" onClick={createGallery}>
                    Створити
                  </button>

                  {newCode ? (
                    <div className="card" style={{ border: "1px solid rgba(34,197,94,0.6)", padding: 12 }}>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Код доступу:
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{newCode}</div>
                      <button
                        type="button"
                        className="btn"
                        style={{ marginTop: 10 }}
                        onClick={() => navigator.clipboard.writeText(newCode)}
                      >
                        Копіювати
                      </button>
                    </div>
                  ) : null}
                </div>

                <hr className="sep" style={{ margin: "14px 0" }} />

                <h3 style={{ marginTop: 0 }}>Галереї</h3>
                <div className="stack" style={{ maxHeight: 420, overflow: "auto" }}>
                  {galleries.map((g) => (
                    <div
                      key={g._id}
                      className="card"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        textAlign: "left",
                        padding: 12,
                        border:
                          g._id === activeId
                            ? "2px solid rgba(34,197,94,0.9)"
                            : "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.25)",
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveId(g._id)}
                        onKeyDown={(e) => (e.key === "Enter" ? setActiveId(g._id) : null)}
                        style={{ cursor: "pointer", flex: 1 }}
                      >
                        <div style={{ fontWeight: 800 }}>{g.clientName || "Без імені"}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {g.slug}
                        </div>
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
                  {!galleries.length ? <div className="muted">Поки що немає галерей.</div> : null}
                </div>

                {/* ✅ НОВИЙ БЛОК: КЕРУВАННЯ СЛОТАМИ */}
                <hr className="sep" style={{ margin: "16px 0" }} />

                <h3 style={{ marginTop: 0 }}>Слоти онлайн-запису</h3>

                <div className="stack">
                  <div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      Дата
                    </div>
                    <input className="input" type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
                  </div>

                  <div className="muted" style={{ fontSize: 12 }}>
                    Натисни на <b>вільний</b> слот → стане <b>заблокованим</b>. Натисни на <b>заблокований</b> → стане вільним.
                    Слоти з бронюваннями клієнтів не змінюються.
                  </div>

                  <div
                    className="card"
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.18)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(slotAvail || []).map((s) => {
                        const b = findBookingForSlot(s.time);
                        const kind = s.isFree ? "free" : b?.isBlock ? "blocked" : "booked";

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
                              opacity: slotBusy ? 0.6 : kind === "booked" ? 0.35 : 1,
                              cursor: slotBusy ? "wait" : kind === "booked" ? "not-allowed" : "pointer",
                              border:
                                kind === "free"
                                  ? "2px solid rgba(34,197,94,0.85)"
                                  : kind === "blocked"
                                  ? "2px solid rgba(245,158,11,0.85)"
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
                      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                        {slotMsg}
                      </div>
                    ) : null}

                    {!slotBusy && !slotAvail?.length ? (
                      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                        Немає слотів для цієї дати.
                      </div>
                    ) : null}

                    {/* Легенда */}
                    <div className="muted" style={{ marginTop: 10, fontSize: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>🟩 Вільно</span>
                      <span>🟧 Заблоковано адміном</span>
                      <span>⬜ Зайнято клієнтом</span>
                    </div>
                  </div>
                </div>

                {/* ✅ НОВИЙ БЛОК: ВІДГУКИ (ДОДАНО) */}
                <hr className="sep" style={{ margin: "16px 0" }} />
                <h3 style={{ marginTop: 0 }}>Відгуки клієнтів</h3>

                <div className="tabs" style={{ marginBottom: 10 }}>
                  <button className={`tab ${revStatusTab === "pending" ? "active" : ""}`} type="button" onClick={() => setRevStatusTab("pending")}>
                   В очікуванні
                  </button>
                  <button className={`tab ${revStatusTab === "approved" ? "active" : ""}`} type="button" onClick={() => setRevStatusTab("approved")}>
                    Підтверджені
                  </button>
                  <button className={`tab ${revStatusTab === "rejected" ? "active" : ""}`} type="button" onClick={() => setRevStatusTab("rejected")}>
                  Відхилені
                  </button>
                </div>

                {revMsg ? (
                  <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                    {revMsg}
                  </div>
                ) : null}

                <div className="stack" style={{ maxHeight: 360, overflow: "auto" }}>
                  {(revItems || []).map((r) => (
                    <div key={r._id} className="card" style={{ padding: 12, background: "rgba(0,0,0,0.22)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800 }}>
                            {r.name}{" "}
                            <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
                              ({r.rating}/5)
                            </span>
                          </div>
                          {r.contact ? (
                            <div className="muted" style={{ fontSize: 12 }}>
                              {r.contact}
                            </div>
                          ) : null}
                          {r.createdAt ? (
                            <div className="muted" style={{ fontSize: 12 }}>
                              {new Date(r.createdAt).toLocaleString()}
                            </div>
                          ) : null}
                        </div>

                        <button type="button" className="icon-btn" onClick={() => removeReview(r._id)} title="Видалити">
                          🗑️
                        </button>
                      </div>

                      <div className="muted" style={{ marginTop: 8, fontSize: 13, whiteSpace: "pre-wrap" }}>
                        {r.text}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        <button className="btn" type="button" disabled={revBusy} onClick={() => setReviewStatus(r._id, "approved")}>
                         Підтвердити
                        </button>
                        <button className="btn" type="button" disabled={revBusy} onClick={() => setReviewStatus(r._id, "rejected")}>
                          Відхилити
                        </button>
            
                      </div>
                    </div>
                  ))}
                  {!revBusy && !revItems.length ? <div className="muted">Поки що порожньо.</div> : null}
                </div>
              </div>

              {/* RIGHT */}
              <div className="card panel-card">
                <div className="section-head">
                  <div>
                    <h3 style={{ margin: 0 }}>Фото галереї</h3>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      Клієнт: <b>{active?.clientName || "—"}</b> | Ліміт: <b>{active?.selectionLimit || 10}</b> | Фото:{" "}
                      <b>{active?.photos?.length || 0}</b> | Лайкнуто: <b>{active?.selectedPhotoIds?.length || 0}</b>
                    </div>
                  </div>

                  <div className="file-row">
                    <label className="btn" style={{ cursor: activeId ? "pointer" : "not-allowed", opacity: activeId ? 1 : 0.5 }}>
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
                  <div className="muted" style={{ marginTop: 14 }}></div>
                ) : (
                  <>
                    <div className="thumb-grid">
                      {(active?.photos || []).map((p) => {
                        const liked = (active?.selectedPhotoIds || []).includes(p._id);
                        return (
                          <div
                            key={p._id}
                            className="thumb"
                            style={{
                              border: "1px solid rgba(255,255,255,0.10)",
                              position: "relative",
                            }}
                          >
                            {liked ? (
                              <div
                                title="Лайк клієнта"
                                style={{
                                  position: "absolute",
                                  top: 10,
                                  left: 10,
                                  fontSize: 18,
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  border: "1px solid rgba(255,255,255,0.16)",
                                  background: "rgba(0,0,0,0.35)",
                                  zIndex: 2,
                                }}
                              >
                                ❤️
                              </div>
                            ) : null}

                            <img
                              src={p.url}
                              alt={p.filename || "photo"}
                              loading="lazy"
                              style={{ cursor: "zoom-in" }}
                              onClick={() => openLightboxByPhotoId(p._id)}
                            />

                            <div style={{ padding: "10px 10px 0 10px" }}>
                              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                                Статус:
                              </div>

                              <select
                                value={p.status || "preview"}
                                onChange={(e) => setPhotoStatus(p._id, e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  background: "rgba(0,0,0,0.25)",
                                  border: "1px solid rgba(255,255,255,0.10)",
                                  borderRadius: 12,
                                  color: "white",
                                }}
                              >
                                <option value="preview">Для відбору ретуші</option>
                                <option value="final">Остаточні</option>
                              </select>

                              <div
                                className="muted"
                                style={{
                                  marginTop: 8,
                                  fontSize: 12,
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: 999,
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
                                {(p.status || "preview") === "final" ? "Фінальне (можна завантажувати)" : "Превʼю (для вибору)"}
                              </div>
                            </div>

                            <div className="thumb-foot">
                              <div
                                className="muted"
                                style={{
                                  fontSize: 12,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "80%",
                                }}
                              >
                                {p.filename || p.publicId}
                              </div>
                              <button type="button" className="icon-btn" onClick={() => removePhoto(p._id)} title="Видалити">
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!active?.photos?.length ? <div className="muted" style={{ marginTop: 14 }}>Поки що фото не завантажені.</div> : null}

                    {/* ✅ ОКРЕМИЙ БЛОК: ВИБІР КЛІЄНТА */}
                    <div style={{ marginTop: 16 }}>
                      <h3 style={{ margin: "10px 0 6px 0" }}>Вибір клієнта</h3>

                      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                        Обрано: <b>{active?.selectedPhotoIds?.length || 0}</b> / <b>{active?.selectionLimit || 10}</b>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                          Коментар клієнта:
                        </div>
                        <div
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(0,0,0,0.18)",
                            minHeight: 44,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {active?.comment?.trim() ? active.comment : <span className="muted">Немає</span>}
                        </div>
                      </div>

                      {selectedPhotos.length === 0 ? (
                        <div className="muted">Клієнт ще нічого не обрав.</div>
                      ) : (
                        <div className="thumb-grid">
                          {selectedPhotos.map((p) => (
                            <div
                              key={p._id}
                              className="thumb"
                              style={{
                                border: "1px solid rgba(255,255,255,0.14)",
                                position: "relative",
                              }}
                            >
                              <div
                                title="Вибір клієнта"
                                style={{
                                  position: "absolute",
                                  top: 10,
                                  left: 10,
                                  fontSize: 18,
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  border: "1px solid rgba(255,255,255,0.16)",
                                  background: "rgba(0,0,0,0.35)",
                                  zIndex: 2,
                                }}
                              >
                                ❤️
                              </div>

                              <img
                                src={p.url}
                                alt={p.filename || "selected"}
                                loading="lazy"
                                style={{ cursor: "zoom-in" }}
                                onClick={() => openLightboxByPhotoId(p._id)}
                              />

                              <div className="thumb-foot">
                                <div
                                  className="muted"
                                  style={{
                                    fontSize: 12,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: "100%",
                                  }}
                                >
                                  {p.filename || p.publicId}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="muted" style={{ marginTop: 14, fontSize: 12 }}></div>
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