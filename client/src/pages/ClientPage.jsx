import Lightbox from "../components/Lightbox";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clientLogin, getMyGallery, saveMySelection } from "../api";

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

  const maxSelect = useMemo(
    () => Number(gallery?.selectionLimit ?? gallery?.maxSelect ?? 0) || 0,
    [gallery]
  );

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

  // -------- Lightbox helpers ----------
  const photos = Array.isArray(gallery?.photos) ? gallery.photos : [];
const normStatus = (p) => String(p?.status || "preview").trim().toLowerCase();

const previewPhotos = photos.filter((p) => normStatus(p) !== "final");
const finalPhotos = photos.filter((p) => normStatus(p) === "final");


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

      <header>
        <div className="container nav">
          <Link className="brand" to="/">
            <div className="logo" aria-hidden="true"></div>
            <h1>Alina Photographer</h1>
          </Link>

        

          <button className="btn" type="button" onClick={logout}>Вийти</button>
        </div>
      </header>

      <main className="container" style={{ paddingBottom: 50, overflowX: "hidden" }}>
        <section style={{ paddingTop: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 className="title" style={{ marginBottom: 6 }}>Галерея</h2>
              <p className="lead" style={{ margin: 0 }}>
                Натисніть на фото — щоб відкрити на весь екран. Натисніть ❤ — щоб обрати для ретуші.
              </p>
            </div>

            <button className="btn" type="button" onClick={save} disabled={saving}>
              {saving ? "Збереження…" : "Зберегти вибір"}
            </button>
          </div>

          <div className="panel-grid" style={{ marginTop: 14, gridTemplateColumns: "1fr 1fr" }}>
            <div className="card panel-card">
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                Клієнт: <span style={{ fontWeight: 700 }}>{gallery?.clientName || "—"}</span>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Обрано: <b>{selected.size}</b> / {maxSelect || "—"}
              </div>
              {status ? <div className="muted" style={{ marginTop: 10 }}>{status}</div> : null}
            </div>

            <div className="card panel-card">
              <div className="stack">
                <div style={{ fontWeight: 800 }}>Коментар для ретуші (необов'язково)</div>
                <textarea
                  className="input"
                  style={{ minHeight: 110, resize: "vertical" }}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Наприклад: прибрати прищ / зробити шкіру м’якше / підправити колір…"
                />
              </div>
            </div>
          </div>

          <h3 style={{ marginTop: 18, marginBottom: 12 }}>Фото для ретуші</h3>

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
                    {/* click on photo => lightbox */}
                    <img
                      src={p.url}
                      alt={p.filename || "photo"}
                      loading="lazy"
                      style={{ cursor: "zoom-in" }}
                      onClick={() => openLightboxById(id)}
                    />

                    {/* Like button (separate from image click) */}
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

          <h3 style={{ marginTop: 22, marginBottom: 12 }}>Фінальні фото (можна завантажити)</h3>

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
                      className="btn"
                      onClick={() => downloadFinal(p)}
                      disabled={busy}
                      style={{ position: "absolute", right: 10, bottom: 10, padding: "8px 10px" }}
                    >
                      {busy ? "..." : "⬇️ Завантажити"}
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

      {/* Lightbox */}
         {/* Lightbox */}
      <Lightbox
        isOpen={lbOpen}
        src={lbPhoto?.url}
        title={lbPhoto?.filename || lbPhoto?.publicId}
        onClose={closeLightbox}
        onPrev={prevPhoto}
        onNext={nextPhoto}

        // ✅ ДОДАЛИ: лайк/завантаження прямо у fullscreen
        canLike={(lbPhoto?.status || "preview") !== "final"}
        liked={selected.has(lbPhoto?._id || lbPhoto?.id)}
        onToggleLike={() => toggleSelect(lbPhoto)}

        canDownload={(lbPhoto?.status || "preview") === "final"}
        onDownload={() => downloadFinal(lbPhoto)}
      />

    </>
  );
}
