import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  adminLogin,
  adminListGalleries,
  adminCreateGallery,
  adminUploadPhotos,
  adminDeletePhoto,
} from "../api";

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const [galleries, setGalleries] = useState([]);
  const [activeId, setActiveId] = useState("");

  const [create, setCreate] = useState({
    clientName: "",
    contact: "",
    selectionLimit: 10,
  });

  const [newCode, setNewCode] = useState("");

  const active = useMemo(() => galleries.find((g) => g._id === activeId), [galleries, activeId]);

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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
  }

  async function createGallery() {
    try {
      setStatus("Створення...");
      const data = await adminCreateGallery(token, create);
      setNewCode(data.accessCode);
      setStatus("Створено ✅ (код показано нижче)");
      setCreate({ clientName: "", contact: "", selectionLimit: 10 });
      await load();
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function uploadPhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeId) return;

    try {
      setStatus("Завантаження фото...");
      await adminUploadPhotos(token, activeId, files);
      setStatus("Фото додано ✅");
      await load();
      e.target.value = "";
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function removePhoto(photoId) {
    if (!activeId) return;
    try {
      setStatus("Видалення...");
      await adminDeletePhoto(token, activeId, photoId);
      setStatus("Видалено ✅");
      await load();
    } catch (e) {
      setStatus(e.message);
    }
  }

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

          {token ? (
            <button className="btn" type="button" onClick={logout} title="Вийти">
              Вийти
            </button>
          ) : null}
        </div>
      </header>

      <main className="container" style={{ paddingBottom: 40 }}>
        <section className="hero" style={{ paddingTop: 18 }}>
          <div>
            <h2 className="title" style={{ marginBottom: 10 }}>
              Адмін-панель
            </h2>

            <p className="lead" style={{ marginBottom: 0 }}>
              Створюйте клієнтів/галереї, генеруйте код доступу, завантажуйте фото в Cloudinary та керуйте файлами.
            </p>

            {status ? <div className="muted" style={{ marginTop: 10 }}>{status}</div> : null}
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
                <div className="muted" style={{ fontSize: 12 }}>
                  Пароль береться з <code>server/.env</code>: <b>ADMIN_PASSWORD</b>
                </div>
              </div>
            </div>
          ) : (
            <div className="card panel-card" style={{ alignSelf: "start" }}>
              <div className="stack">
                <strong>Швидкі підказки</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  1) Створи галерею → 2) Скопіюй код → 3) Вибери галерею в списку → 4) Завантаж фото.
                </div>
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
                    placeholder="Контакт (телефон/email)"
                    value={create.contact}
                    onChange={(e) => setCreate({ ...create, contact: e.target.value })}
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
                      <div className="muted" style={{ fontSize: 12 }}>Код доступу (надішли клієнту):</div>
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
                    <button
                      key={g._id}
                      type="button"
                      onClick={() => setActiveId(g._id)}
                      className="card"
                      style={{
                        textAlign: "left",
                        padding: 12,
                        cursor: "pointer",
                        border:
                          g._id === activeId
                            ? "2px solid rgba(34,197,94,0.9)"
                            : "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.25)",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{g.clientName || "Без імені"}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {g.slug}
                      </div>
                    </button>
                  ))}
                  {!galleries.length ? <div className="muted">Поки що немає галерей.</div> : null}
                </div>
              </div>

              {/* RIGHT */}
              <div className="card panel-card">
                <div className="section-head">
                  <div>
                    <h3 style={{ margin: 0 }}>Фото галереї</h3>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      Клієнт: <b>{active?.clientName || "—"}</b> | Ліміт:{" "}
                      <b>{active?.selectionLimit || 10}</b> | Фото: <b>{active?.photos?.length || 0}</b>
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
                  <div className="muted" style={{ marginTop: 14 }}>
                    Вибери галерею зліва, щоб завантажувати фото.
                  </div>
                ) : (
                  <>
                    <div className="thumb-grid">
                      {(active?.photos || []).map((p) => (
                        <div key={p._id} className="thumb">
                          <img src={p.url} alt={p.filename || "photo"} loading="lazy" />
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
                      ))}
                    </div>

                    {!active?.photos?.length ? (
                      <div className="muted" style={{ marginTop: 14 }}>
                        Поки що фото не завантажені.
                      </div>
                    ) : null}

                    <div className="muted" style={{ marginTop: 14, fontSize: 12 }}>
                      * Файли зберігаються у <b>Cloudinary</b>, а в MongoDB — лише метадані (url/publicId/filename).
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
