import Lightbox from "../components/Lightbox";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clientLogin, getMyGallery, saveMySelection } from "../api";

/* =========================
   ✅ ІКОНКА ЗАВАНТАЖЕННЯ
========================= */
function DownloadIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v10m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* =========================
   ✅ календарний місяць + відлік часу
========================= */
function addOneMonth(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();

  const target = new Date(y, m + 1, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();

  target.setDate(Math.min(day, lastDay));
  target.setHours(23, 59, 59, 999);
  return target;
}

function getTimeLeft(expiresAt) {
  const end = new Date(expiresAt).getTime();
  const diff = end - Date.now();

  if (!Number.isFinite(end) || diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0 };
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return { expired: false, days, hours, minutes };
}

export default function ClientPage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("clientToken") || "");

  const [gallery, setGallery] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");

  // Lightbox
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  // tick for timer
  const [tick, setTick] = useState(0);

  const maxSelect = useMemo(
    () => Number(gallery?.selectionLimit ?? gallery?.maxSelect ?? 0) || 0,
    [gallery]
  );

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const expiresAt = useMemo(() => {
    if (!gallery) return null;
    if (gallery.expiresAt) return new Date(gallery.expiresAt);
    if (gallery.createdAt) return addOneMonth(gallery.createdAt);
    return null;
  }, [gallery]);

  const timeLeft = useMemo(() => {
    if (!expiresAt) return null;
    return getTimeLeft(expiresAt);
  }, [expiresAt, tick]);

  const expiresLabel = useMemo(() => {
    if (!expiresAt) return "";
    return expiresAt.toLocaleDateString("uk-UA", { year: "numeric", month: "2-digit", day: "2-digit" });
  }, [expiresAt, tick]);

  useEffect(() => {
    const t = localStorage.getItem("theme") || "dark";
    document.documentElement.classList.toggle("light", t === "light");
  }, []);

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        setStatus("Завантаження галереї…");
        const data = await getMyGallery(token);
        setGallery(data);

        const prev =
          Array.isArray(data?.selectedPhotoIds) ? data.selectedPhotoIds :
          Array.isArray(data?.photoIds) ? data.photoIds :
          [];

        setSelected(new Set(prev));
        if (typeof data?.comment === "string") setComment(data.comment);

        setStatus("");
      } catch (e) {
        console.error(e);
        setStatus("Помилка доступу. Спробуйте увійти ще раз.");
        localStorage.removeItem("clientToken");
        setToken("");
      }
    })();
  }, [token]);

  async function doLogin() {
    const trimmed = code.trim();
    if (!trimmed) return setStatus("Введіть код доступу.");

    try {
      setStatus("Перевіряю код…");
      const { token: tkn } = await clientLogin(trimmed);
      localStorage.setItem("clientToken", tkn);
      setToken(tkn);
      setStatus("");
    } catch (e) {
      console.error(e);
      setStatus("Невірний код або код прострочений.");
    }
  }

  function logout() {
    localStorage.removeItem("clientToken");
    setToken("");
    setGallery(null);
    setSelected(new Set());
    setComment("");
    setStatus("");
    setLbOpen(false);
    setLbIndex(0);
  }

  function toggleSelect(photo) {
    const id = photo?._id || photo?.id;
    if (!id) return;

    if ((photo?.status || "preview") === "final") {
      setStatus("Це фінальне фото. Його можна завантажити кнопкою ⬇️.");
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
        return next;
      }

      if (maxSelect && next.size >= maxSelect) {
        setStatus(`Можна обрати максимум ${maxSelect} фото.`);
        return next;
      }

      setStatus("");
      next.add(id);
      return next;
    });
  }

  async function save() {
    if (!token) return;

    const photoIds = Array.from(selected);

    try {
      setSaving(true);
      setStatus("Зберігаю вибір…");

      await saveMySelection(token, {
        selectedPhotoIds: photoIds,
        comment,
      });

      setStatus("✅ Збережено!");
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      console.error(e);
      setStatus(e.message || "❌ Помилка збереження");
    } finally {
      setSaving(false);
    }
  }

  async function downloadFinal(photo) {
    const url = photo?.url;
    if (!url) return;

    const name = photo?.filename || photo?.publicId || `photo-${photo?._id || "final"}.jpg`;

    try {
      setDownloadingId(photo?._id || photo?.id || "");
      setStatus("Готую завантаження…");

      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);

      setStatus("");
    } catch (e) {
      console.error(e);
      window.open(url, "_blank", "noopener,noreferrer");
      setStatus("Відкрив(ла) фото в новій вкладці (звідти можна зберегти).");
      setTimeout(() => setStatus(""), 2000);
    } finally {
      setDownloadingId("");
    }
  }

  async function downloadAllFinal() {
    if (!finalPhotos.length) {
      setStatus("Фінальних фото ще немає.");
      return;
    }

    setStatus("Запускаю завантаження всіх фінальних фото…");

    for (const p of finalPhotos) {
      await downloadFinal(p);
      await new Promise((r) => setTimeout(r, 250));
    }

    setStatus("✅ Завантаження запущено.");
    setTimeout(() => setStatus(""), 1500);
  }

  // -------- Photos helpers ----------
  const photos = Array.isArray(gallery?.photos) ? gallery.photos : [];
  const normStatus = (p) => String(p?.status || "preview").trim().toLowerCase();

  const previewPhotos = photos.filter((p) => normStatus(p) !== "final");
  const finalPhotos = photos.filter((p) => normStatus(p) === "final");

  const coverPhoto = useMemo(() => {
    if (finalPhotos.length) return finalPhotos[0];
    if (previewPhotos.length) return previewPhotos[0];
    return photos[0] || null;
  }, [finalPhotos, previewPhotos, photos]);

  const lbPhoto = photos[lbIndex];

  function openLightboxById(id) {
    const idx = photos.findIndex((x) => (x._id || x.id) === id);
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

  // ---------- LOGIN ----------
  if (!token) {
    return (
      <>
        <div className="waves" aria-hidden="true"></div>
        <div className="noise" aria-hidden="true"></div>

        <header>
          <div className="container nav">
            <Link className="brand" to="/">
              <div className="logo" aria-hidden="true"></div>
              <h1>Alina Photographer</h1>
            </Link>

            <nav>
              <Link to="/">Головна</Link>
              <Link to="/booking">Запис</Link>
              <Link to="/client">Кабінет</Link>
            </nav>
          </div>
        </header>

        <main className="container" style={{ paddingBottom: 50, overflowX: "hidden" }}>
          <section className="hero" style={{ paddingTop: 18 }}>
            <div>
              <h2 className="title" style={{ marginBottom: 10 }}>Кабінет клієнта</h2>
              <p className="lead" style={{ marginBottom: 0, maxWidth: 560 }}>
                Введіть код доступу, який вам надав фотограф.
              </p>
              {status ? <div className="muted" style={{ marginTop: 12 }}>{status}</div> : null}
            </div>

            <div className="card panel-card" style={{ alignSelf: "start" }}>
              <div className="stack">
                <strong>Код доступу</strong>
                <input
                  className="input"
                  placeholder="Наприклад: ABCD-1234"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                />
                <button className="btn wide" type="button" onClick={doLogin}>Увійти</button>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  // ---------- GALLERY ----------
  return (
    <>
      <div className="waves" aria-hidden="true"></div>
      <div className="noise" aria-hidden="true"></div>

      {/* ✅ локальні стилі для мобільних кнопок */}
      <style>{`
        /* header кнопка "Завантажити всі" — компактна на мобільному */
        @media (max-width: 640px) {
          .btn-download-all {
            padding: 10px 12px !important;
            border-radius: 16px !important;
            font-size: 14px !important;
            gap: 8px !important;
            white-space: nowrap !important;
          }
        }

        /* Кнопка завантаження на фото — щоб не була “жахлива” в мобільній */
        .btn-download-one {
          position: absolute;
          right: 10px;
          bottom: 10px;
          padding: 8px 10px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 640px) {
          .btn-download-one {
            width: 44px !important;
            height: 44px !important;
            padding: 0 !important;
            border-radius: 999px !important;
            display: grid !important;
            place-items: center !important;
          }
          .btn-download-one .btn-text {
            display: none !important;
          }
          .btn-download-one svg {
            width: 20px !important;
            height: 20px !important;
          }
        }

        /* Коментарний блок: краще виглядає + кнопка поруч */
        .comment-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        @media (max-width: 640px) {
          .comment-head {
            flex-direction: column;
            align-items: stretch;
          }
          .comment-head .btn {
            width: 100%;
          }
        }
      `}</style>

      {/* ✅ aurora фон */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: -120,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(600px 280px at 15% 25%, rgba(120, 180, 255, 0.28), transparent 60%)," +
            "radial-gradient(520px 260px at 85% 20%, rgba(255, 120, 200, 0.22), transparent 55%)," +
            "radial-gradient(700px 320px at 50% 85%, rgba(120, 255, 210, 0.18), transparent 60%)",
          filter: "blur(40px)",
          transform: "translate3d(0,0,0)",
          opacity: 0.9,
        }}
      />

      <header>
        <div className="container nav">
          <Link className="brand" to="/">
            <div className="logo" aria-hidden="true"></div>
            <h1>Alina Photographer</h1>
          </Link>

          <button className="btn" type="button" onClick={logout}>Вийти</button>
        </div>
      </header>

      <main className="container" style={{ paddingBottom: 50, overflowX: "hidden", position: "relative", zIndex: 1 }}>
        {/* HERO */}
        {coverPhoto ? (
          <section style={{ paddingTop: 18, marginBottom: 18 }}>
            <div
              style={{
                position: "relative",
                borderRadius: 22,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.25)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
              }}
            >
              <img
                src={coverPhoto.url}
                alt={coverPhoto.filename || "cover"}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "min(62vh, 520px)",
                  objectFit: "cover",
                  display: "block",
                  cursor: "zoom-in",
                  transform: "scale(1.02)",
                }}
                onClick={() => openLightboxById(coverPhoto._id || coverPhoto.id)}
              />

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.75) 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: 18,
                  right: 18,
                  bottom: 16,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "clamp(22px, 4vw, 46px)",
                      fontWeight: 900,
                      letterSpacing: 0.5,
                      lineHeight: 1.05,
                      textShadow: "0 10px 30px rgba(0,0,0,0.55)",
                    }}
                  >
                    {gallery?.clientName || "Галерея"}
                  </div>

                  <div style={{ marginTop: 8, display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
                    {expiresAt && timeLeft ? (
                      <span
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(0,0,0,0.35)",
                          backdropFilter: "blur(10px)",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        ⏳ До видалення: {timeLeft.days} дн. {timeLeft.hours} год.
                      </span>
                    ) : null}

                    {expiresAt ? (
                      <span
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(0,0,0,0.35)",
                          backdropFilter: "blur(10px)",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        🗓 До: {expiresLabel}
                      </span>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn"
                  onClick={() => openLightboxById(coverPhoto._id || coverPhoto.id)}
                  style={{ padding: "10px 12px" }}
                >
                  Відкрити
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section style={{ paddingTop: 18 }}>
          <div>
            <h2 className="title" style={{ marginBottom: 6 }}>Галерея</h2>
            <p className="lead" style={{ margin: 0 }}>
              Натисніть на фото — щоб відкрити на весь екран. Натисніть ❤ — щоб обрати для ретуші.
            </p>
          </div>

          {/* ✅ Залишили тільки коментар (гарніше) + на його рівні "Зберегти вибір" */}
          <div style={{ marginTop: 14 }}>
            <div className="card panel-card">
              <div className="comment-head">
                <div style={{ fontWeight: 900, fontSize: 16 }}>Коментар для ретуші (необов'язково)</div>

                <button className="btn" type="button" onClick={save} disabled={saving}>
                  {saving ? "Збереження…" : "Зберегти вибір"}
                </button>
              </div>

              <textarea
                className="input"
                style={{ minHeight: 120, resize: "vertical" }}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Наприклад: прибрати прищ / зробити шкіру м’якше / підправити колір…"
              />

              {/* статус/підказки */}
              {status ? <div className="muted" style={{ marginTop: 10 }}>{status}</div> : null}
            </div>
          </div>

          {/* ✅ Заголовок + лічильник обраних — тут, біля “Фото для ретуші” */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 18,
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>Фото для ретуші</h3>
            <div className="muted" style={{ fontWeight: 700 }}>
              Обрано: <b>{selected.size}</b> / {maxSelect || "—"}
            </div>
          </div>

          <div className="thumb-grid">
            {previewPhotos.length ? (
              previewPhotos.map((p) => {
                const id = p._id || p.id;
                const liked = id ? selected.has(id) : false;

                return (
                  <div
                    key={id}
                    className="thumb"
                    style={{
                      position: "relative",
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.20)",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={p.url}
                      alt={p.filename || "photo"}
                      loading="lazy"
                      style={{ cursor: "zoom-in" }}
                      onClick={() => openLightboxById(id)}
                    />

                    <button
                      type="button"
                      onClick={() => toggleSelect(p)}
                      aria-pressed={liked}
                      title={liked ? "Прибрати лайк" : "Лайкнути"}
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 38,
                        height: 38,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid rgba(255,255,255,0.22)",
                        background: "rgba(0,0,0,0.35)",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: 18,
                        cursor: "pointer",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      {liked ? "❤️" : "🤍"}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="card panel-card">Немає фото для ретуші.</div>
            )}
          </div>

          {/* Фінальні фото + “Завантажити всі” */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 22,
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>Фінальні фото (можна завантажити)</h3>

            <button
              type="button"
              className="btn btn-download-all"
              onClick={downloadAllFinal}
              disabled={!finalPhotos.length}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              title={finalPhotos.length ? "Завантажити всі фінальні фото" : "Фінальних фото немає"}
            >
              <DownloadIcon />
              Завантажити всі
            </button>
          </div>

          <div className="thumb-grid">
            {finalPhotos.length ? (
              finalPhotos.map((p) => {
                const id = p._id || p.id;
                const busy = downloadingId === id;

                return (
                  <div
                    key={id}
                    className="thumb"
                    style={{
                      position: "relative",
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.20)",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={p.url}
                      alt={p.filename || "photo"}
                      loading="lazy"
                      style={{ cursor: "zoom-in" }}
                      onClick={() => openLightboxById(id)}
                    />

                    <button
                      type="button"
                      className="btn btn-download-one"
                      onClick={() => downloadFinal(p)}
                      disabled={busy}
                      title="Завантажити"
                    >
                      {busy ? (
                        "..."
                      ) : (
                        <>
                          <DownloadIcon />
                          <span className="btn-text">Завантажити</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="card panel-card">Фінальних фото ще немає.</div>
            )}
          </div>
        </section>
      </main>

      <Lightbox
        isOpen={lbOpen}
        src={lbPhoto?.url}
        title={lbPhoto?.filename || lbPhoto?.publicId}
        onClose={closeLightbox}
        onPrev={prevPhoto}
        onNext={nextPhoto}
        canLike={(lbPhoto?.status || "preview") !== "final"}
        liked={selected.has(lbPhoto?._id || lbPhoto?.id)}
        onToggleLike={() => toggleSelect(lbPhoto)}
        canDownload={(lbPhoto?.status || "preview") === "final"}
        onDownload={() => downloadFinal(lbPhoto)}
      />
    </>
  );
}
