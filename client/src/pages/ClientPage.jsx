import Lightbox from "../components/Lightbox";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clientLogin, getMyGallery, saveMySelection } from "../api";

function DownloadIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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

function addOneMonth(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();

  const target = new Date(y, m + 1, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();

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
  const [token, setToken] = useState(
    () => localStorage.getItem("client_token") || "",
  );

  const [gallery, setGallery] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");

  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  const [tick, setTick] = useState(0);

  const maxSelect = useMemo(
    () => Number(gallery?.selectionLimit ?? gallery?.maxSelect ?? 0) || 0,
    [gallery],
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
    return expiresAt.toLocaleDateString("uk-UA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
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

        const prev = Array.isArray(data?.selectedPhotoIds)
          ? data.selectedPhotoIds
          : Array.isArray(data?.photoIds)
            ? data.photoIds
            : [];

        setSelected(new Set(prev));
        if (typeof data?.comment === "string") setComment(data.comment);

        setStatus("");
      } catch (e) {
        console.error(e);
        setStatus("Помилка доступу. Спробуйте увійти ще раз.");
        localStorage.removeItem("client_token");
        setToken("");
      }
    })();
  }, [token]);

  async function doLogin() {
    const trimmed = code.trim();
    if (!trimmed) return setStatus("Введіть код доступу.");

    try {
      setStatus("Вхід...");
      const res = await clientLogin(trimmed);

      // Гнучкий витяг токена
      const tkn =
        res?.token ||
        res?.accessToken ||
        res?.data?.token ||
        (typeof res === "string" ? res : null) ||
        localStorage.getItem("client_token");

      if (tkn) {
        localStorage.setItem("client_token", tkn);
        setToken(tkn);
        setStatus("");
      } else {
        console.warn("Сервер не повернув токен:", res);
        setStatus("Помилка отримання токена.");
      }
    } catch (e) {
      console.error(e);
      setStatus("Невірний код або код прострочений.");
    }
  }

  function logout() {
    localStorage.removeItem("client_token");
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
      setStatus("Збереження...");

      await saveMySelection(token, {
        selectedPhotoIds: photoIds,
        comment,
      });

      setStatus("Збережено!");
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      console.error(e);
      setStatus(e.message || "Помилка збереження");
    } finally {
      setSaving(false);
    }
  }

  async function downloadFinal(photo) {
    const url = photo?.url;
    if (!url) return;

    const name =
      photo?.filename ||
      photo?.publicId ||
      `photo-${photo?._id || "final"}.jpg`;

    try {
      setDownloadingId(photo?._id || photo?.id || "");

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
      setTimeout(() => setStatus(""), 2000);
    } finally {
      setDownloadingId("");
    }
  }

  async function downloadAllFinal() {
    if (!finalPhotos.length) return;

    for (const p of finalPhotos) {
      await downloadFinal(p);
      await new Promise((r) => setTimeout(r, 250));
    }

    setTimeout(() => setStatus(""), 1500);
  }

  const photos = Array.isArray(gallery?.photos) ? gallery.photos : [];
  const normStatus = (p) =>
    String(p?.status || "preview")
      .trim()
      .toLowerCase();

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

        <main className="container client-main-login">
          <section className="hero client-login-hero">
            <div>
              <h2 className="title client-title">Кабінет клієнта</h2>
              <p className="lead client-login-lead">
                Введіть код доступу, який вам надав фотограф.
              </p>
              {status ? (
                <div className="muted client-status-top">{status}</div>
              ) : null}
            </div>

            <div className="card panel-card client-login-card">
              <div className="stack">
                <strong>Код доступу</strong>
                <input
                  className="input"
                  placeholder="Наприклад: ABCD-1234"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                />
                <button className="btn wide" type="button" onClick={doLogin}>
                  Увійти
                </button>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <div className="waves" aria-hidden="true"></div>
      <div className="noise" aria-hidden="true"></div>

      <div className="client-aurora" aria-hidden="true"></div>

      <header>
        <div className="container nav">
          <Link className="brand" to="/">
            <div className="logo" aria-hidden="true"></div>
            <h1>Alina Photographer</h1>
          </Link>

          <button className="btn" type="button" onClick={logout}>
            Вийти
          </button>
        </div>
      </header>

      <main className="container client-main">
        {coverPhoto ? (
          <section className="client-cover-section">
            <div className="client-cover-card">
              <img
                src={coverPhoto.url}
                alt={coverPhoto.filename || "cover"}
                loading="lazy"
                className="client-cover-image"
                onClick={() => openLightboxById(coverPhoto._id || coverPhoto.id)}
              />

              <div className="client-cover-overlay" />

              <div className="client-cover-content">
                <div>
                  <div className="client-cover-title">
                    {gallery?.clientName || "Галерея"}
                  </div>

                  <div className="client-cover-badges">
                    {expiresAt && timeLeft ? (
                      <span className="client-cover-badge">
                        ⏳ До видалення: {timeLeft.days} дн. {timeLeft.hours} год.
                      </span>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn client-cover-open-btn"
                  onClick={() => openLightboxById(coverPhoto._id || coverPhoto.id)}
                >
                  Відкрити
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="client-gallery-section">
          <div>
            <h2 className="title client-gallery-title">Галерея</h2>
            <p className="lead client-gallery-lead"></p>
          </div>

          <div className="client-comment-wrap">
            <div className="card panel-card">
              <div className="comment-head">
                <div className="client-comment-title">
                  Коментар для ретуші (необов'язково)
                </div>

                <button
                  className="btn"
                  type="button"
                  onClick={save}
                  disabled={saving}
                >
                  {"Зберегти вибір"}
                </button>
              </div>

              <textarea
                className="input client-comment-textarea"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Наприклад: прибрати прищ / зробити шкіру м’якше / підправити колір…"
              />

              {status ? (
                <div className="muted client-status-inline">{status}</div>
              ) : null}
            </div>
          </div>

          <div className="client-section-head">
            <h3 className="client-section-title-reset">Фото для ретуші</h3>
            <div className="muted client-counter">
              Обрано: <b>{selected.size}</b> / {maxSelect || "—"}
            </div>
          </div>

          <div className="thumb-grid">
            {previewPhotos.length ? (
              previewPhotos.map((p) => {
                const id = p._id || p.id;
                const liked = id ? selected.has(id) : false;

                return (
                  <div key={id} className="thumb client-photo-thumb">
                    <img
                      src={p.url}
                      alt={p.filename || "photo"}
                      loading="lazy"
                      className="client-zoomable-img"
                      onClick={() => openLightboxById(id)}
                    />

                    <button
                      type="button"
                      onClick={() => toggleSelect(p)}
                      aria-pressed={liked}
                      title={liked ? "Прибрати лайк" : "Лайкнути"}
                      className="client-like-btn"
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

          <div className="client-section-head client-section-head-finals">
            <h3 className="client-section-title-reset">Фінальні фото</h3>

            <button
              type="button"
              className="btn btn-download-all client-download-all-btn"
              onClick={downloadAllFinal}
              disabled={!finalPhotos.length}
              title={
                finalPhotos.length
                  ? "Завантажити всі фінальні фото"
                  : "Фінальних фото немає"
              }
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
                  <div key={id} className="thumb client-photo-thumb">
                    <img
                      src={p.url}
                      alt={p.filename || "photo"}
                      loading="lazy"
                      className="client-zoomable-img"
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