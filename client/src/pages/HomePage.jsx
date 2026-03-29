import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ChatWidget from "../components/ChatWidget";

export default function HomePage() {
  const API_BASE = import.meta.env.VITE_API_BASE;

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

  // ✅ Retouch before/after (slider + auto animation)
  const retouchWrapRef = useRef(null);
  const [retouchPos, setRetouchPos] = useState(55); // %
  const [retouchDragging, setRetouchDragging] = useState(false);
  const [retouchInView, setRetouchInView] = useState(false);

  // ✅ REVIEWS: fallback static (твій масив як було)
  const reviews = useMemo(
    () => [
      {
        name: "Марія",
        tag: "Відгук",
        text:
          "Дуже комфортно на зйомці. Аліна підказувала позування, все було швидко й без зайвої метушні. Фото — 🔥, виглядають природно!",
        rating: 5,
        pills: ["Комфорт", "Підказки", "Природна ретуш"],
      },
      {
        name: "Анастасія",
        tag: "Відгук",
        text:
          "Діти взагалі не хотіли фоткатися, але якось непомітно все вийшло 🙂 Кадри живі, емоційні, і ретуш дуже акуратна.",
        rating: 5,
        pills: ["Комфорт", "Підказки", "Природна ретуш"],
      },
      {
        name: "Катерина",
        tag: "Відгук",
        text:
          "Я хвилювалась, але було легко. Плюс — онлайн-запис реально зручний: вибрала слот, подала заявку — і все.",
        rating: 5,
        pills: ["Комфорт", "Підказки", "Природна ретуш"],
      },
      {
        name: "Юлія",
        tag: "Відгук",
        text:
          "Зловила моменти, які ми навіть не помічали. Світло, кольори — супер. Фото отримали швидше, ніж очікували.",
        rating: 5,
        pills: ["Комфорт", "Підказки", "Природна ретуш"],
      },
      {
        name: "Ірина",
        tag: "Відгук",
        text:
          "Дуже тактовно направляє, не “ламає” в кадрі. Знімки — прям як з Pinterest, але без штучності. Рекомендую!",
        rating: 5,
        pills: ["Комфорт", "Підказки", "Природна ретуш"],
      },
    ],
    []
  );

  // ✅ REVIEWS: state for DB reviews (ADDED)
  const [dbReviews, setDbReviews] = useState([]);
  const [dbReviewsLoading, setDbReviewsLoading] = useState(false);

  const [revIndex, setRevIndex] = useState(0);
  const [revPaused, setRevPaused] = useState(false);
  const reviewsWrapRef = useRef(null);
  const [reviewsInView, setReviewsInView] = useState(false);

  // ✅ REVIEWS FORM: поля для відправки відгуку в БД
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // ✅ REVIEWS FORM: тип зйомки (ADDED)
  const SHOOT_TYPES = useMemo(
    () => ["Портрет", "Сімейна", "Лавсторі", "Події", "Весілля", "Вінчання/Хрестини", "Інше"],
    []
  );
  const [reviewShootType, setReviewShootType] = useState(SHOOT_TYPES[0]);

  // ✅ REVIEWS FORM: chips (ADDED)
  const FEATURE_OPTIONS = useMemo(
    () => ["Комфорт", "Підказки", "Природна ретуш", "Швидко", "Атмосфера", "Результат"],
    []
  );
  const [reviewFeatures, setReviewFeatures] = useState(["Комфорт", "Підказки", "Природна ретуш"]);

  function toggleFeature(label) {
    setReviewFeatures((prev) => {
      const has = prev.includes(label);
      if (has) return prev.filter((x) => x !== label);
      return [...prev, label];
    });
  }

  // apply theme to html
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const el = retouchWrapRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(([entry]) => setRetouchInView(entry.isIntersecting), { threshold: 0.35 });

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ✅ REVIEWS: detect in-view
  useEffect(() => {
    const el = reviewsWrapRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(([entry]) => setReviewsInView(entry.isIntersecting), { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ✅ REVIEWS: load from DB (ADDED)
  useEffect(() => {
    let alive = true;

    async function load() {
      setDbReviewsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/reviews?limit=50`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Помилка отримання відгуків");

        const items = Array.isArray(data?.reviews) ? data.reviews : [];
        const mapped = items.map((it) => ({
          _id: it?._id,
          name: it?.name || "Клієнт",
          tag: "Відгук",
          // ✅ Тип зйомки (ADDED) — підхоплюємо з різних можливих назв поля
          shootType: it?.shootType || it?.shootingType || it?.sessionType || it?.type || "",
          text: it?.text || "",
          rating: Number(it?.rating || 5),
          // якщо на бекенді буде поле features/tags — покажемо чіпси
          pills: Array.isArray(it?.features)
            ? it.features
            : Array.isArray(it?.tags)
            ? it.tags
            : ["Комфорт", "Підказки", "Природна ретуш"],
        }));

        if (alive) setDbReviews(mapped);
      } catch (_) {
        if (alive) setDbReviews([]);
      } finally {
        if (alive) setDbReviewsLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  // ✅ Use DB reviews if exist, otherwise fallback static
  const allReviews = dbReviews?.length ? dbReviews : reviews;

  // keep revIndex valid if reviews count changed
  useEffect(() => {
    const len = allReviews?.length || 0;
    if (!len) return;
    if (revIndex > len - 1) setRevIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allReviews?.length]);

  // ✅ REVIEWS: auto-advance
  useEffect(() => {
    if (revPaused) return;
    if (!reviewsInView) return;
    if (!allReviews?.length) return;

    const t = setInterval(() => {
      setRevIndex((i) => (i + 1) % allReviews.length);
    }, 4200);

    return () => clearInterval(t);
  }, [revPaused, reviewsInView, allReviews?.length]);

  function setPosFromClientX(clientX) {
    const el = retouchWrapRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const pct = (x / rect.width) * 100;
    setRetouchPos(Math.round(pct * 10) / 10);
  }

  function onRetouchPointerDown(e) {
    setRetouchDragging(true);
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (_) {}
    setPosFromClientX(e.clientX);
  }

  function onRetouchPointerMove(e) {
    if (!retouchDragging) return;
    setPosFromClientX(e.clientX);
  }

  function onRetouchPointerUp(e) {
    setRetouchDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  }

  const photos = [
    { cat: "portrait", src: "/images/IMG_3480.jpg", alt: "portrait" },
    { cat: "family", src: "/images/IMG_2335.jpg", alt: "family" },
    { cat: "event", src: "/images/IMG_3611.jpg", alt: "event" },

    { cat: "portrait", src: "/images/IMG_3563.jpg", alt: "portrait" },
    { cat: "family", src: "/images/IMG_6737.jpg", alt: "family" },
    { cat: "event", src: "/images/IMG_0822.jpg", alt: "event" },

    { cat: "portrait", src: "/images/IMG_2743.jpg", alt: "portrait" },
    { cat: "family", src: "/images/IMG_7066.jpg", alt: "family" },
    { cat: "event", src: "/images/IMG_2714.jpg", alt: "event" },
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

    if (slots?.length) {
      const slot = slots.find((s) => s?.time === time);
      if (!slot) {
        setBookMsg("❌ Оберіть час зі списку доступних слотів.");
        return;
      }
      if (!slot.isFree) {
        setBookMsg("❌ Цей час вже зайнятий. Оберіть інший час.");
        return;
      }
    }

    setBookLoading(true);
    try {
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
      await loadSlots(date);
    } catch (e) {
      setBookMsg("❌ " + (e?.message || "Помилка"));
    } finally {
      setBookLoading(false);
    }
  }

  // ✅ REVIEWS FORM submit: відправка відгуку в БД (узгоджено з твоїм reviewRoutes.js)
  async function submitReview() {
    setReviewMsg("");

    const nm = reviewName.trim();
    const tx = reviewText.trim();
    const rt = Number(reviewRating);

    if (!nm || !tx) {
      setReviewMsg("❌ Заповніть імʼя та текст відгуку.");
      return;
    }
    if (!Number.isFinite(rt) || rt < 1 || rt > 5) {
      setReviewMsg("❌ Оцінка має бути від 1 до 5.");
      return;
    }

    setReviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nm,
          rating: rt,
          text: tx,
          contact: "",
          website: "", // honeypot must be empty
          features: reviewFeatures, // ⚠️ збережеться тільки якщо в Review model є це поле
          shootType: reviewShootType, // ✅ ADDED
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Помилка відправки відгуку");

      // важливо: у тебе на бекенді відгук стане pending, тому на головній не з'явиться до approved
      setReviewMsg(data?.message || "Дякую! Відгук відправлено ☺️");
      setReviewName("");
      setReviewRating(5);
      setReviewText("");
      setReviewFeatures(["Комфорт", "Підказки", "Природна ретуш"]);
      setReviewShootType(SHOOT_TYPES[0]); // ✅ ADDED
    } catch (e) {
      setReviewMsg("❌ " + (e?.message || "Помилка"));
    } finally {
      setReviewLoading(false);
    }
  }

  // ✅ REVIEWS helpers
  const safeMod = (n, m) => ((n % m) + m) % m;

  // ✅ FIX duplicates: show 1/2/3 cards depending on count
  const visibleReviews = (() => {
    const len = allReviews?.length || 0;
    if (!len) return [];
    if (len === 1) return [allReviews[0]];
    if (len === 2) return [allReviews[safeMod(revIndex, len)], allReviews[safeMod(revIndex + 1, len)]];
    return [
      allReviews[safeMod(revIndex, len)],
      allReviews[safeMod(revIndex + 1, len)],
      allReviews[safeMod(revIndex + 2, len)],
    ];
  })();

  const initials = (n = "") => (String(n).trim().slice(0, 1) || "A").toUpperCase();

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
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("about");
              }}
            >
              Про мене
            </a>
            <a
              href="#portfolio"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("portfolio");
              }}
            >
              Портфоліо
            </a>

            <a
              href="#reviews"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("reviews");
              }}
            >
              Відгуки
            </a>

            <a
              href="#services"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("services");
              }}
            >
              Послуги
            </a>
            <a
              href="#booking"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("booking");
              }}
            >
              Онлайн-запис
            </a>
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
             Я – Аліна, фотограф. Люблю знімати людей, емоції та моменти, які хочеться пам’ятати.
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

  
          </div>

          <div className="hero-photo">
            <img src="/images/alina.jpg" alt="Alina" loading="eager" decoding="async" />
          </div>
        </section>

        {/* ABOUT */}
        <section id="about">
          <h3 className="section-title">Про мене</h3>
          <div className="grid cols-2">
            <div className="card">
              <p className="muted">
               Під час зйомки допомагаю з позуванням, підбором локацій та образів, щоб ви почувалися легко й природно перед камерою. 
               Атмосфера на зйомці завжди спокійна й невимушена, тому люди швидко забувають про хвилювання. У кадрі для мене важливі справжні емоції, атмосфера моменту та деталі, які роблять фотографії живими.
              </p>
              <div className="chips">
                <span className="chip">Портрет</span>
                <span className="chip">Сімейна</span>
                <span className="chip">Лавсторі</span>
                <span className="chip">Події</span>
              </div>
            </div>

            <div className="card">
              <strong>Чому цей сайт зручний:</strong>
              <ul className="muted">
                <li>Швидка онлайн-заявка на бронювання.</li>
                <li>Приватні галереї з доступом за кодом.</li>
                <li>Збір вибору фото на ретуш (у кабінеті клієнта).</li>
          
              </ul>
            </div>
          </div>
        </section>

        {/* ✅ REVIEWS */}
        <section id="reviews" ref={reviewsWrapRef}>
          <div className="reviews-head">
            <div>
              <h3 className="section-title" style={{ marginBottom: 6 }}>
                Відгуки клієнтів
              </h3>
              <div className="muted" style={{ fontSize: 14 }}>
                {dbReviewsLoading ? <span style={{ marginLeft: 8 }}>• Завантажую…</span> : null}
              </div>
            </div>

            <div className="reviews-actions">
             
              <button className="btn" type="button" onClick={() => scrollToId("leave-review")} title="Залишити відгук">
                Залишити відгук
              </button>
              <button className="btn" type="button" onClick={() => scrollToId("booking")} title="Записатися">
                Записатися
              </button>
            </div>
          </div>

          <div
            className={`reviews-grid ${reviewsInView ? "rev-in" : ""}`}
            onMouseEnter={() => setRevPaused(true)}
            onMouseLeave={() => setRevPaused(false)}
            style={{ marginTop: 14 }}
          >
            {visibleReviews.map((r, idx) => (
              <div className="card review-card" key={`${r?._id || "local"}-${revIndex}-${idx}`}>
                <div className="review-top">
                  <div className="review-avatar" aria-hidden="true">
                    {initials(r?.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="review-name">{r?.name}</div>
                    <div className="muted review-tag">{r?.tag || "Відгук"}</div>

                    {/* ✅ Тип зйомки (ADDED) */}
                    {r?.shootType ? (
                      <div className="muted review-tag" style={{ marginTop: 4 }}>
                        Тип зйомки: <b>{r.shootType}</b>
                      </div>
                    ) : null}
                  </div>

                  <div className="review-stars" aria-label={`Оцінка: ${r?.rating || 5} з 5`}>
                    {Array.from({ length: 5 }).map((_, sIdx) => (
                      <span key={sIdx} className={`star ${sIdx < (r?.rating || 5) ? "on" : ""}`} aria-hidden="true">
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <p className="muted review-text">{r?.text}</p>

                <div className="review-bottom">
                  {/* ✅ FIX: показуємо весь список без slice(0,6) */}
                  {(Array.isArray(r?.pills) ? r.pills : []).map((p, pIdx) => (
                    <span className="pill" key={`${p}-${pIdx}`}>
                      ✓ {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="reviews-dots" style={{ marginTop: 12 }}>
            {allReviews.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`dot ${i === revIndex ? "active" : ""}`}
                onClick={() => setRevIndex(i)}
                aria-label={`Показати відгук ${i + 1}`}
                onMouseEnter={() => setRevPaused(true)}
                onMouseLeave={() => setRevPaused(false)}
              />
            ))}
          </div>

          <style>{`
            .reviews-head{
              display:flex;
              align-items:flex-end;
              justify-content:space-between;
              gap:14px;
              flex-wrap:wrap;
              margin-top: 6px;
            }
            .reviews-actions{
              display:flex;
              gap:10px;
              flex-wrap:wrap;
              align-items:center;
            }
            .reviews-grid{
              display:grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap:14px;
            }
            @media (max-width: 980px){
              .reviews-grid{ grid-template-columns: 1fr; }
            }

            .review-card{
              position:relative;
              overflow:hidden;
              transform: translateY(6px);
              opacity: 0.92;
              transition: transform .28s ease, opacity .28s ease;
              background: rgba(0,0,0,0.18);
              border: 1px solid rgba(255,255,255,0.10);
            }
            .rev-in .review-card{
              animation: revPop .45s ease both;
            }
            .rev-in .review-card:nth-child(2){ animation-delay: .06s; }
            .rev-in .review-card:nth-child(3){ animation-delay: .12s; }

            @keyframes revPop{
              from { transform: translateY(10px); opacity: 0.0; }
              to   { transform: translateY(0px);  opacity: 1.0; }
            }

            .review-card:hover{
              transform: translateY(-2px);
              opacity: 1;
            }

            .review-top{
              display:flex;
              gap:12px;
              align-items:center;
              justify-content:space-between;
              margin-bottom: 10px;
            }
            .review-avatar{
              width:42px;
              height:42px;
              border-radius: 999px;
              display:grid;
              place-items:center;
              font-weight: 700;
              letter-spacing: 0.4px;
              background: rgba(255,255,255,0.10);
              border: 1px solid rgba(255,255,255,0.14);
              flex: 0 0 auto;
            }
            .review-name{
              font-weight: 700;
              line-height: 1.2;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 240px;
            }
            .review-tag{
              font-size: 12px;
              opacity: 0.85;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 260px;
            }
            .review-stars{
              display:flex;
              gap:2px;
              flex: 0 0 auto;
              margin-left: 10px;
              opacity: .95;
            }
            .star{
              font-size: 14px;
              opacity: .35;
              transform: translateY(-1px);
            }
            .star.on{
              opacity: 1;
              text-shadow: 0 0 18px rgba(255,255,255,0.20);
            }
            .review-text{
              margin: 0;
              font-size: 14px;
              line-height: 1.55;
            }
            .review-bottom{
              display:flex;
              gap:8px;
              flex-wrap:wrap;
              margin-top: 12px;
            }
            .pill{
              font-size: 12px;
              padding: 6px 10px;
              border-radius: 999px;
              border: 1px solid rgba(255,255,255,0.12);
              background: rgba(0,0,0,0.22);
              opacity: 0.9;
            }

            .reviews-dots{
              display:flex;
              gap:8px;
              justify-content:center;
              align-items:center;
              flex-wrap:wrap;
              user-select:none;
            }
            .dot{
              width: 10px;
              height: 10px;
              border-radius: 999px;
              border: 1px solid rgba(255,255,255,0.22);
              background: rgba(255,255,255,0.08);
              cursor:pointer;
              transition: transform .18s ease, opacity .18s ease, width .18s ease;
              opacity: .75;
            }
            .dot:hover{ transform: scale(1.12); opacity: 1; }
            .dot.active{
              width: 26px;
              opacity: 1;
              background: rgba(255,255,255,0.22);
              border-color: rgba(255,255,255,0.30);
            }
          `}</style>
        </section>

        {/* PORTFOLIO */}
        <section id="portfolio">
          <h3 className="section-title">Портфоліо</h3>

          <div className="tabs">
            <button className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")} type="button">
              Усе
            </button>
            <button className={`tab ${tab === "portrait" ? "active" : ""}`} onClick={() => setTab("portrait")} type="button">
              Портрет
            </button>
            <button className={`tab ${tab === "family" ? "active" : ""}`} onClick={() => setTab("family")} type="button">
              Сімейна
            </button>
            <button className={`tab ${tab === "event" ? "active" : ""}`} onClick={() => setTab("event")} type="button">
              Події
            </button>
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
              <h4>Індивідуальна зйомка – 1 година</h4>
              <div className="price">
                <span className="num">750</span>
                <span className="u">грн</span>
              </div>
              <p className="muted">  40 фото у ретуші. Надаю можливість особисто відібрати фотографії на ретуш
              </p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setPkg("Індивідуальна 1 год — 750 грн");
                  scrollToId("booking");
                }}
              >
                Забронювати
              </button>
            </div>

            <div className="card">
              <h4>Індивідуальна зйомка – 30 хв</h4>
              <div className="price">
                <span className="num">500</span>
                <span className="u">грн</span>
              </div>
              <p className="muted">Швидка портретна сесія. 20 фото у ретуші.</p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setPkg("Індивідуальна 30 хв — 500 грн");
                  scrollToId("booking");
                }}
              >
                Забронювати
              </button>
            </div>

            <div className="card">
              <h4>Сімейна зйомка - 1 година</h4>
              <div className="price">
                <span className="num">850</span>
                <span className="u">грн</span>
              </div>
              <p className="muted">До 4 осіб. 50 фото у ретуші.</p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setPkg("Сімейна 1 год — 850 грн");
                  scrollToId("booking");
                }}
              >
                Забронювати
              </button>
            </div>

            <div className="card">
              <h4>Вінчання / Хрестини</h4>
              <div className="price">
                <span className="num">900</span>
                <span className="u">грн</span>
              </div>
              <p className="muted">Репортажна зйомка обрядів. </p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setPkg("Вінчання/Хрестини — 900 грн");
                  scrollToId("booking");
                }}
              >
                Забронювати
              </button>
            </div>

            <div className="card">
              <h4>Весільна зйомка (розпис + вулична)</h4>
              <div className="price">
                <span className="num">1000</span>
                <span className="u">грн</span>
              </div>
              <p className="muted">Близько 1,5 години. Ключові моменти + міні-сесія.</p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setPkg("Весільна (1,5 год) — 1000 грн");
                  scrollToId("booking");
                }}
              >
                Забронювати
              </button>
            </div>

            <div className="card">
              <h4>Професійна ретуш</h4>
              <div className="price">
                <span className="num">50</span>
                <span className="u">грн</span>
              </div>
              <p className="muted">1 фото в професійній ретуші.</p>
              <button className="btn" type="button" onClick={() => scrollToId("retouch")}>
                Переглянути
              </button>
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
                  <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

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
                            border: time === s.time ? "2px solid rgba(34,197,94,0.85)" : "1px solid rgba(255,255,255,0.12)",
                            background: "transparent",
                          }}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>

                    {slotsLoading ? (
                      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                        Завантажується час, зачекайте, будь ласка...
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

                
              </div>
            </div>

            <div className="slots card">
              <h4>Дані бронювання</h4>

              <div className="row" style={{ marginTop: 10 }}>
                <input className="input" placeholder="Ваше імʼя" value={name} onChange={(e) => setName(e.target.value)} />
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
                <option>Індивідуальна 1 год — 750 грн</option>
                <option>Індивідуальна 30 хв — 500 грн</option>
                <option>Сімейна 1 год — 850 грн</option>
                <option>Вінчання/Хрестини — 900 грн</option>
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

              <p className="muted hint">* Після заявки я звʼяжусь з вами для узгодження деталей.</p>
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
                Вхід у приватну галерею відбувається <b>тільки за кодом</b>.  
              </p>
              <Link className="btn" to="/client">
                Перейти в кабінет
              </Link>
               <hr className="sep" />
              <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                Код доступу видаю після зйомки.
              </p>
            </div>

            <div className="card">
              <h4>Що є всередині</h4>
              <ul className="muted">
                <li>Завантажити фото ви можете протягом 1 місяця.</li>
                <li>Поставте лайк і, за бажанням, напишіть коментар, під час вибору фотографій на ретуш .</li>
                <li>Зручне завантаження фотографій, ви можете завантажити однією кнопкою всі фото.</li>
              </ul>
             
             
            </div>
          </div>
        </section>

    

        {/* RETOUCH */}
        <section id="retouch">
          <h3 className="section-title">Ретуш: до / після</h3>

          <div className="grid cols-2">
            <div className="card">
              <h4 style={{ marginTop: 0 }}>Акуратна ретуш без “пластика”</h4>
              <p className="muted">
                Чистка шкіри, легке вирівнювання тону, робота з кольором та світлом так, щоб фото виглядали природно.
                Якщо хочеш “глянець” або навпаки максимально натурально – це узгоджується.
              </p>

              <ul className="muted" style={{ marginTop: 10 }}>
                <li>Збереження текстури шкіри</li>
                <li>Корекція кольору та контрасту</li>
                <li>Локальні правки (очі/волосся/деталі)</li>
              </ul>


              
              <a
                className="btn"
                href="https://instagram.com/ashch.phh"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
              >
                Звʼязатись зі мною 
              </a>
            </div>

            <div className="card">
              <div
                ref={retouchWrapRef}
                className={`ba-wrap ${retouchInView ? "ba-inview" : ""} ${retouchDragging ? "ba-dragging" : ""}`}
                onPointerDown={onRetouchPointerDown}
                onPointerMove={onRetouchPointerMove}
                onPointerUp={onRetouchPointerUp}
                onPointerCancel={onRetouchPointerUp}
                role="img"
                aria-label="Порівняння ретуші: до і після"
                style={{
                  borderRadius: 18,
                  overflow: "hidden",
                  position: "relative",
                  aspectRatio: "16 / 21",
                  userSelect: "none",
                  touchAction: "none",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.25)",
                }}
              >
                {/* BEFORE */}
                <img
                  src="/images/після 5.jpg"
                  alt="До ретуші"
                  draggable={false}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "contrast(1.02)",
                  }}
                />

                {/* AFTER (clipped) */}
                <div
                  className="ba-after"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${retouchPos}%`,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src="/images/до1 copy.jpg"
                    alt="Після ретуші"
                    draggable={false}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>

                {/* Divider + Handle */}
                <div
                  className="ba-divider"
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${retouchPos}%`,
                    width: 2,
                    transform: "translateX(-1px)",
                    background: "rgba(255,255,255,0.65)",
                    boxShadow: "0 0 18px rgba(255,255,255,0.20)",
                    pointerEvents: "none",
                  }}
                />

                <div
                  className="ba-handle"
                  style={{
                    position: "absolute",
                    left: `${retouchPos}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.55)",
                    border: "1px solid rgba(255,255,255,0.45)",
                    display: "grid",
                    placeItems: "center",
                    backdropFilter: "blur(8px)",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ display: "flex", gap: 6, alignItems: "center", opacity: 0.95 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>◀</span>
                    <span style={{ fontSize: 12, lineHeight: 1, letterSpacing: 0.6 }}></span>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>▶</span>
                  </div>
                </div>

                {/* Labels */}
                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 12,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.45)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    fontSize: 12,
                  }}
                >
                  До
                </div>
                <div
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 12,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.45)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    fontSize: 12,
                  }}
                >
                  Після
                </div>
              </div>

              <style>{`
                .ba-wrap.ba-inview:not(.ba-dragging) .ba-after {
                  animation: baSweep 2.8s ease-in-out infinite alternate;
                }
                .ba-wrap.ba-inview:not(.ba-dragging) .ba-divider,
                .ba-wrap.ba-inview:not(.ba-dragging) .ba-handle {
                  animation: baSweepLine 2.8s ease-in-out infinite alternate;
                }

                @keyframes baSweep {
                  0%   { width: 18%; }
                  100% { width: 86%; }
                }
                @keyframes baSweepLine {
                  0%   { left: 18%; }
                  100% { left: 86%; }
                }

                .ba-wrap.ba-dragging .ba-after,
                .ba-wrap.ba-dragging .ba-divider,
                .ba-wrap.ba-dragging .ba-handle {
                  animation: none !important;
                }
              `}</style>

              <div className="muted" style={{ marginTop: 10, fontSize: 12 }}></div>
            </div>
          </div>
</section>

{/* ✅ FORM: Leave review */}
<section id="leave-review" className="leave-review-wrap">
  <h3 className="section-title leave-review-title">Залишити відгук</h3>

  <div className="leave-review-center">
    <div className="card leave-review-card">
      <p className="muted leave-review-intro">
        Якщо вам сподобалась зйомка, напишіть короткий відгук. Це дуже допомагає ❤️
      </p>

      <div className="leave-review-stack">
        <div className="leave-review-grid-top">
          <div className="leave-review-field leave-review-field-name">
            <label className="muted label">Імʼя</label>
            <input
              className="input"
              placeholder="Ваше імʼя"
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
            />
          </div>

          <div className="leave-review-field">
            <label className="muted label">Оцінка</label>

            <div className="leave-review-rating-row">
              {Array.from({ length: 5 }).map((_, i) => {
                const val = i + 1;
                const on = val <= reviewRating;

                return (
                  <button
                    key={val}
                    type="button"
                    className={`btn leave-review-star ${on ? "is-active" : ""}`}
                    onClick={() => setReviewRating(val)}
                    title={`${val} з 5`}
                  >
                    {on ? "★" : "☆"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="leave-review-field leave-review-field-type">
            <label className="muted label">Тип зйомки</label>
            <select
              className="input leave-review-select-short"
              value={reviewShootType}
              onChange={(e) => setReviewShootType(e.target.value)}
            >
              {SHOOT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="leave-review-field">
          <label className="muted label">Що сподобалось (можна обрати декілька)</label>

          <div className="leave-review-features">
            {FEATURE_OPTIONS.map((opt) => {
              const on = reviewFeatures.includes(opt);

              return (
                <button
                  key={opt}
                  type="button"
                  className={`btn leave-review-chip ${on ? "is-active" : ""}`}
                  onClick={() => toggleFeature(opt)}
                  title={opt}
                >
                  {on ? "✓ " : ""}
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <div className="leave-review-field">
        
          <textarea
            className="input leave-review-textarea"
            placeholder="Напишіть кілька речень..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={5}
          />
        </div>

        <button
  className="btn leave-review-submit"
  type="button"
  onClick={submitReview}
  disabled={reviewLoading}
>
Надіслати відгук
</button>

        {reviewMsg ? (
          <p className="muted leave-review-message">
            {reviewMsg}
          </p>
        ) : null}
      </div>
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