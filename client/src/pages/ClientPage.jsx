import { useEffect, useMemo, useState } from "react";
import { clientLogin, getMyGallery, saveMySelection } from "../api";

export default function ClientPage() {
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";

  const [token, setToken] = useState(() => localStorage.getItem("galleryToken") || "");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [note, setNote] = useState("");

  const selectedArr = useMemo(() => Array.from(selected), [selected]);

  async function doLogin() {
    try {
      setStatus("Вхід...");
      const data = await clientLogin(code);
      localStorage.setItem("galleryToken", data.token);
      setToken(data.token);
      setCode("");
      setStatus("Успішно ✅");
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function load() {
    if (!token) return;
    try {
      setStatus("Завантаження...");
      const data = await getMyGallery(token);
      setGallery(data.gallery);
      setPhotos(data?.photos || data?.gallery?.photos || []);
      const ids = new Set((data.selection?.selectedPhotoIds || []).map(String));
      setSelected(ids);
      setNote(data.selection?.note || "");
      setStatus("");
    } catch (e) {
      setStatus(e.message);
      if (String(e.message || "").toLowerCase().includes("token")) {
        localStorage.removeItem("galleryToken");
        setToken("");
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    try {
      if (!gallery) return;
      setStatus("Збереження...");
      const res = await saveMySelection(token, { selectedPhotoIds: selectedArr, note });
      setSelected(new Set((res.selection?.selectedPhotoIds || []).map(String)));
      setNote(res.selection?.note || "");
      setStatus("Збережено ✅");
      setTimeout(() => setStatus(""), 1200);
    } catch (e) {
      setStatus(e.message);
    }
  }

  function logout() {
    localStorage.removeItem("galleryToken");
    setToken("");
    setGallery(null);
    setPhotos([]);
    setSelected(new Set());
    setNote("");
    setStatus("");
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
        <h2>Кабінет клієнта</h2>
        <p style={{ opacity: 0.8 }}>
          Введіть <b>код доступу</b>, який вам надав фотограф.
        </p>

        <input
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #444", marginTop: 10 }}
          placeholder="Наприклад: ABCD-1234"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          style={{ marginTop: 12, width: "100%", padding: 12, borderRadius: 10, border: "none", cursor: "pointer" }}
          onClick={doLogin}
        >
          Увійти
        </button>

        {status && <p style={{ marginTop: 12 }}>{status}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Галерея</h2>
          {gallery?.clientName && <p style={{ margin: "6px 0 0", opacity: 0.8 }}>{gallery.clientName}</p>}
        </div>
        <button onClick={logout} style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer" }}>
          Вийти
        </button>
      </div>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}

      <div style={{ marginTop: 14, padding: 12, border: "1px solid #444", borderRadius: 12 }}>
        <p style={{ margin: 0 }}>
          Обрано: <b>{selectedArr.length}</b> / {gallery?.selectionLimit || 10}
        </p>

        <textarea
          style={{ width: "100%", marginTop: 10, padding: 12, borderRadius: 10, border: "1px solid #444", minHeight: 90 }}
          placeholder="Коментар для ретуші (необовʼязково)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button
          onClick={save}
          style={{ marginTop: 10, padding: 12, borderRadius: 10, border: "none", cursor: "pointer" }}
        >
          Зберегти вибір
        </button>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {photos.map((p) => {
          const id = String(p._id);
          const isSel = selected.has(id);
          const isFinal = String(p.status || "preview") === "final";
          return (
            <div
              key={id}
              style={{
                border: isSel ? "2px solid #22c55e" : "1px solid #444",
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
              }}
              onClick={() => toggle(id)}
              title="Натисни, щоб вибрати/зняти вибір"
            >
              <img src={p.url} alt={p.filename || "photo"} style={{ width: "100%", height: 220, objectFit: "cover" }} />
              <div style={{ padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.filename || p.publicId}
                </span>

                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(id);
                    }}
                    title={isSel ? "Зняти лайк" : "Лайкнути для ретуші"}
                    style={{
                      border: "1px solid #444",
                      background: "transparent",
                      borderRadius: 10,
                      padding: "6px 8px",
                      cursor: "pointer",
                    }}
                  >
                    {isSel ? "❤️" : "🤍"}
                  </button>

                  {isFinal ? (
                    <a
                      href={`${API_BASE}/galleries/me/photos/${id}/download`}
                      onClick={(e) => e.stopPropagation()}
                      title="Завантажити"
                      style={{
                        border: "1px solid #444",
                        borderRadius: 10,
                        padding: "6px 8px",
                        textDecoration: "none",
                      }}
                    >
                      ⬇️
                    </a>
                  ) : (
                    <span title="Поки що не доступно для завантаження" style={{ opacity: 0.7 }}>
                      🔒
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {!photos.length && <p style={{ marginTop: 16, opacity: 0.8 }}>Поки що фото не завантажені.</p>}
    </div>
  );
}
