import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ChatWidget from "../components/ChatWidget";
export default function HomePage() {
  const API_BASE = useMemo(() => {
    // Має збігатися з client/src/api.js: VITE_API_BASE=http://localhost:5001/api
    // Якщо тут не знайде — fallback.
    return import.meta.env.VITE_API_BASE || "http://localhost:5001/api";
  }, []);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved || "dark";
  });

  const [tab, setTab] = useState("all");

  // Booking form
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("12:30");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [pkg, setPkg] = useState("Індивідуальна 1 год — 600 грн");
  const [bookMsg, setBookMsg] = useState("");
  const [bookLoading, setBookLoading] = useState(false);

  // ✅ Slots (availability)
  const [slots, setSlots] = useState([]); // [{ time: "12:00", isFree: true }]
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  // apply theme to html
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const photos = [
    { cat: "portrait", src: "https://images.unsplash.com/photo-1512252112013-ff5f03fc2d55?q=80&w=800&auto=format&fit=crop", alt: "portrait" },
    { cat: "family", src: "https://images.unsplash.com/photo-1604335399105-a0d4b38dff1d?q=80&w=800&auto=format&fit=crop", alt: "family" },
    { cat: "event", src: "https://images.unsplash.com/photo-1521119989659-a83eee488004?q=80&w=800&auto=format&fit=crop", alt: "event" },
    { cat: "portrait", src: "https://images.unsplash.com/photo-1492447273231-0f8fecec1e59?q=80&w=800&auto=format&fit=crop", alt: "portrait" },
    { cat: "family", src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop", alt: "family" },
    { cat: "event", src: "https://images.unsplash.com/photo-1521335629791-ce4aec67dd53?q=80&w=800&auto=format&fit=crop", alt: "event" },
    { cat: "portrait", src: "https://images.unsplash.com/photo-1509098681029-b45e9c845022?q=80&w=800&auto=format&fit=crop", alt: "portrait" },
    { cat: "family", src: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop", alt: "family" },
    { cat: "event", src: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop", alt: "event" },
  ];

  const filteredPhotos = tab === "all" ? photos : photos.filter((p) => p.cat === tab);

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ✅ завантаження слотів на дату
  async function loadSlots(dateStr) {
    if (!dateStr) return;
    setSlotsError("");
    setSlotsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/bookings/availability?date=${encodeURIComponent(dateStr)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Помилка отримання слотів");

      const list = Array.isArray(data?.slots) ? data.slots : [];
      setSlots(list);

      // якщо вибраний час пустий/зайнятий — ставимо перший вільний
      const chosen = String(time || "");
      const stillFree = list.some((s) => s?.time === chosen && s?.isFree);
      if (!chosen || !stillFree) {
        const firstFree = list.find((s) => s?.isFree);
        if (firstFree?.time) setTime(firstFree.time);
      }
    } catch (e) {
      setSlots([]);
      setSlotsError(e?.message || "Помилка");
    } finally {
      setSlotsLoading(false);
    }
  }

  // ✅ коли змінюється дата — оновлюємо слоти
  useEffect(() => {
    loadSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function submitBooking() {
    setBookMsg("");

    if (!date || !time || !name.trim() || !contact.trim()) {
      setBookMsg("❌ Заповніть дату, час, імʼя та контакт.");
      return;
    }

    // ✅ якщо є слоти — перевіряємо, що обраний слот реально вільний
    if (slots?.length) {
      const slot = slots.find((s) => s?.time === time);
      if (!slot) {
        setBookMsg("❌ Оберіть час зі списку доступних слотів.");
        return;
      }
      if (!slot.isFree) {
        setBookMsg("❌ Цей слот вже зайнятий. Оберіть інший час.");
        return;
      }
    }

    setBookLoading(true);
    try {
      // ✅ правильний endpoint + правильні поля під бекенд
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time,
          clientName: name.trim(),
          contact: contact.trim(),
          packageName: pkg,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Помилка бронювання");

      setBookMsg(data?.message || "✅ Заявку відправлено! Я звʼяжусь з вами для підтвердження.");
      setName("");
      setContact("");

      // ✅ після бронювання — перезавантажуємо слоти, щоб відразу стало видно зайнятий час
      await loadSlots(date);
    } catch (e) {
      setBookMsg("❌ " + (e?.message || "Помилка"));
    } finally {
      setBookLoading(false);
    }
  }

  return (
    <>
      <div className="waves" aria-hidden="true"></div>
      <div className="noise" aria-hidden="true"></div>

      <header>
        <div className="container nav">
          <a
            className="brand"
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToId("top");
            }}
          >
            <div className="logo" aria-hidden="true"></div>
            <h1>Alina Photographer</h1>
          </a>

          <nav>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToId("about"); }}>Про мене</a>
            <a href="#portfolio" onClick={(e) => { e.preventDefault(); scrollToId("portfolio"); }}>Портфоліо</a>
            <a href="#services" onClick={(e) => { e.preventDefault(); scrollToId("services"); }}>Послуги</a>
            <a href="#booking" onClick={(e) => { e.preventDefault(); scrollToId("booking"); }}>Онлайн-запис</a>
            <Link to="/client">Кабінет</Link>
          </nav>

          <div>
            <button
              className="btn"
              type="button"
              id="themeToggle"
              title="Світла/темна тема"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              🌓 Тема
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {/* HERO */}
        <section className="hero" id="top">
          <div>
            <h2 className="title">Light, emotion, precision.</h2>
            <p className="lead">
              Я — Аліна, фотограф. Поєдную естетику, сервіс та порядок. Ви обираєте дату й послугу — залишаєте
              заявку на бронювання, а я отримую повідомлення на пошту. Мінімум переписок — максимум прозорості.
            </p>

            <div className="cta-row">
              <button className="btn" type="button" onClick={() => scrollToId("booking")}>
                Забронювати дату
              </button>

              <a
                className="btn"
                href="https://instagram.com/ashch.phh"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
              >
                @ashch.phh
              </a>

              <button className="btn" type="button" onClick={() => scrollToId("services")}>
                Послуги та ціни
              </button>
            </div>

            <div className="muted how-it-works">
              Як це працює: оберіть дату/час → залиште заявку → я підтверджу бронювання.
            </div>
          </div>

          <div className="hero-photo">
            <img src="/images/alina.jpg" alt="Alina" loading="eager" decoding="async" />
          </div>
        </section>

        {/* ABOUT */}
        <section id="about">
          <h3 className="section-title">Про фотографа</h3>
          <div className="grid cols-2">
            <div className="card">
              <p className="muted">
                Мій стиль — мінімалізм, природні кольори та чисте світло. Працюю швидко й уважно до деталей:
                допомагаю з позуванням, локаціями та образами. Для сімейних зйомок — мʼякий підхід, для портретів —
                акцент на характер, для подій — живі емоції без постановочності.
              </p>
              <div className="chips">
                <span className="chip">Портрет</span>
                <span className="chip">Сімейна</span>
                <span className="chip">Лавсторі</span>
                <span className="chip">Події</span>
              </div>
            </div>

            <div className="card">
              <strong>Чому це зручно:</strong>
              <ul className="muted">
                <li>Швидка онлайн-заявка на бронювання.</li>
                <li>Приватні галереї з доступом за кодом.</li>
                <li>Збір вибору фото на ретуш (у кабінеті клієнта).</li>
                <li>Автоматичне повідомлення фотографу на email.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PORTFOLIO */}
        <section id="portfolio">
          <h3 className="section-title">Портфоліо</h3>

          <div className="tabs">
            <button className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")} type="button">Усе</button>
            <button className={`tab ${tab === "portrait" ? "active" : ""}`} onClick={() => setTab("portrait")} type="button">Портрет</button>
            <button className={`tab ${tab === "family" ? "active" : ""}`} onClick={() => setTab("family")} type="button">Сімейна</button>
            <button className={`tab ${tab === "event" ? "active" : ""}`} onClick={() => setTab("event")} type="button">Події</button>
          </div>

          <div className="folio" id="folio">
            {filteredPhotos.map((p, idx) => (
              <figure className="ph" data-cat={p.cat} key={idx}>
                <img alt={p.alt} src={p.src} />
              </figure>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section id="services">
          <h3 className="section-title">Послуги та ціни</h3>

          <div className="grid cols-3">
            <div className="card">
              <h4>Індивідуальна зйомка — 1 година</h4>
              <div className="price"><span className="num">600</span><span className="u">грн</span></div>
              <p className="muted">Локація на вибір, допомога з позуванням. 15–25 фото у ретуші.</p>
              <button className="btn" type="button" onClick={() => { setPkg("Індивідуальна 1 год — 600 грн"); scrollToId("booking"); }}>
                Забронювати
              </button>
            </div>

            <div className="card">
              <h4>Індивідуальна зйомка — 30 хв</h4>
              <div className="price"><span className="num">400</span><span className="u">грн</span></div>
              <p className="muted">Швидка портретна сесія. 8–12 фото у ретуші.</p>
              <button className="btn" type="button" onClick={() => { setPkg("Індивідуальна 30 хв — 400 грн"); scrollToId("booking"); }}>
                Забронювати
              </button>
            </div>

            <div className="card">
              <h4>Сімейна зйомка — 1 година</h4>
              <div className="price"><span className="num">700</span><span className="u">грн</span></div>
              <p className="muted">До 5 осіб. 20–30 фото у ретуші.</p>
              <button className="btn" type="button" onClick={() => { setPkg("Сімейна 1 год — 700 грн"); scrollToId("booking"); }}>
                Забронювати
              </button>
            </div>

            <div className="card">
              <h4>Вінчання / Хрестини</h4>
              <div className="price"><span className="num">800</span><span className="u">грн</span></div>
              <p className="muted">Репортажна зйомка обрядів. Пакет узгоджується.</p>
              <button className="btn" type="button" onClick={() => { setPkg("Вінчання/Хрестини — 800 грн"); scrollToId("booking"); }}>
                Забронювати
              </button>
            </div>

            <div className="card">
              <h4>Весільна зйомка (розпис + вулична)</h4>
              <div className="price"><span className="num">1000</span><span className="u">грн</span></div>
              <p className="muted">Близько 1,5 години. Ключові моменти + міні-сесія.</p>
              <button className="btn" type="button" onClick={() => { setPkg("Весільна (1,5 год) — 1000 грн"); scrollToId("booking"); }}>
                Забронювати
              </button>
            </div>

            <div className="card">
              <h4>Додаткові опції</h4>
              <p className="muted">Експрес-готовність, додаткові фото у ретуші, візаж.</p>
              <button className="btn" type="button" onClick={() => scrollToId("booking")}>Уточнити</button>
            </div>
          </div>
        </section>

        {/* BOOKING */}
        <section id="booking">
          <h3 className="section-title">Онлайн-запис</h3>

          <div className="booking">
            <div className="calendar card">
              <div className="cal-head" style={{ justifyContent: "center" }}>
                <strong>Оберіть дату та час</strong>
              </div>

              <div style={{ display: "grid", gap: 12, paddingTop: 12 }}>
                <div>
                  <label className="muted label">Дата</label>
                  <input
                    className="input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* ✅ СЛОТИ ЗАМІСТЬ input time */}
                <div>
                  <label className="muted label">Час</label>

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
                      {(slots || []).map((s) => (
                        <button
                          key={s.time}
                          type="button"
                          className="btn"
                          onClick={() => setTime(s.time)}
                          disabled={!s.isFree}
                          title={!s.isFree ? "Вже зайнято" : "Вільний слот"}
                          style={{
                            padding: "8px 10px",
                            opacity: s.isFree ? 1 : 0.35,
                            cursor: s.isFree ? "pointer" : "not-allowed",
                            border:
                              time === s.time
                                ? "2px solid rgba(34,197,94,0.85)"
                                : "1px solid rgba(255,255,255,0.12)",
                            background: "transparent",
                          }}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>

                    {slotsLoading ? (
                      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                        Завантажую слоти…
                      </div>
                    ) : null}

                    {slotsError ? (
                      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                        ❌ {slotsError}
                      </div>
                    ) : null}

                    {!slotsLoading && !slotsError && !slots.length ? (
                      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                        Немає слотів для цієї дати.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="muted" style={{ fontSize: 12 }}>
                  Після натискання “Підтвердити бронювання” заявка буде записана в базу даних,
                  а фотограф отримає повідомлення на email.
                </div>
              </div>
            </div>

            <div className="slots card">
              <h4>Дані бронювання</h4>

              <div className="row" style={{ marginTop: 10 }}>
                <input
                  className="input"
                  placeholder="Ваше імʼя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Instagram або телефон"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>

              <label className="muted label" style={{ marginTop: 12 }}>
                Пакет
              </label>
              <select className="input" value={pkg} onChange={(e) => setPkg(e.target.value)}>
                <option>Індивідуальна 1 год — 600 грн</option>
                <option>Індивідуальна 30 хв — 400 грн</option>
                <option>Сімейна 1 год — 700 грн</option>
                <option>Вінчання/Хрестини — 800 грн</option>
                <option>Весільна (1,5 год) — 1000 грн</option>
              </select>

              <button
                className="btn wide"
                type="button"
                style={{ marginTop: 12 }}
                onClick={submitBooking}
                disabled={bookLoading || slotsLoading}
              >
                {bookLoading ? "Відправляю..." : "Підтвердити бронювання"}
              </button>

              {bookMsg ? (
                <p className="muted" style={{ marginTop: 8 }}>
                  {bookMsg}
                </p>
              ) : null}

              <p className="muted hint">
                * Після заявки фотограф підтвердить час вручну (під дзвінок/повідомлення).
              </p>
            </div>
          </div>
        </section>

        {/* CLIENT */}
        <section id="client">
          <h3 className="section-title">Кабінет клієнта</h3>

          <div className="grid cols-2">
            <div className="card">
              <h4>Приватна галерея</h4>
              <p className="muted">
                Вхід у приватну галерею відбувається <b>тільки за кодом</b>. Після входу відкриється сторінка з фото,
                де можна вибрати знімки на ретуш і додати коментар.
              </p>
              <Link className="btn" to="/client">
                Перейти в кабінет
              </Link>
              <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                Код доступу видає фотограф після зйомки.
              </p>
            </div>

            <div className="card">
              <h4>Що є всередині</h4>
              <ul className="muted">
                <li>Фото зберігаються у хмарі (Cloudinary).</li>
                <li>Доступ до галереї — тільки після авторизації.</li>
                <li>Збереження вибору фото на ретуш.</li>
              </ul>
              <hr className="sep" />
              <p className="muted" style={{ fontSize: 12 }}>
                (Опційно можна додати “signed URLs” для ще кращої приватності.)
              </p>
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section>
          <h3 className="section-title">Безпека та нотифікації</h3>
          <div className="grid cols-2">
            <div className="card">
              <strong>Безпека</strong>
              <ul className="muted">
                <li>Код доступу зберігається у вигляді hash (bcrypt).</li>
                <li>Після входу видається JWT токен клієнта.</li>
                <li>Фото не віддаються без авторизації.</li>
              </ul>
            </div>
            <div className="card">
              <strong>Повідомлення</strong>
              <ul className="muted">
                <li>Після бронювання фотограф отримує email.</li>
                <li>Можна додати нагадування (майбутнє розширення).</li>
                <li>Можна додати підтвердження клієнту на email (майбутнє розширення).</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="container">
        <div className="footer-row">
          <div className="muted" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>© {new Date().getFullYear()}</span>
            <a href="https://instagram.com/ashch.phh" target="_blank" rel="noopener noreferrer" className="ig">
              @ashch.phh
            </a>
          </div>
        </div>
      </footer>
      <ChatWidget apiBase={API_BASE} />

    </>
  );
}
