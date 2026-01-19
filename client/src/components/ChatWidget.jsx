import { useMemo, useRef, useState } from "react";

const PRESET_QA = [
  {
    q: "Скільки триває фотосесія і що входить у пакет?",
    a: "Зазвичай: 30 хв або 1 година (залежить від пакету). Я допомагаю з позуванням, підкажу з локацією/образом. Після зйомки ви отримуєте приватну галерею, де обираєте фото на ретуш.",
  },
  {
    q: "Що вдягнути на зйомку?",
    a: "Краще однотонні речі без великих логотипів. Для портретів — нейтральні кольори, для сімейної — узгоджена палітра. Якщо хочеш — напиши стиль/локацію і я підкажу 2–3 варіанти.",
  },
  {
    q: "Чи допомагаєш з позуванням?",
    a: "Так. Я підказую пози, руки/погляд, слідкую за деталями в кадрі. Вам не потрібно вміти позувати — все проведу по кроках.",
  },
  {
    q: "Коли будуть готові фото?",
    a: "Термін залежить від завантаження та пакету. Зазвичай кілька днів на відбір + ретуш. Якщо потрібно швидко — можна домовитись про експрес-готовність.",
  },
  {
    q: "Де проходить зйомка — студія чи вулиця?",
    a: "Як вам зручно: вулиця/місто, кафе, студія (оренда студії зазвичай оплачується окремо). Порадьтеся зі мною — підберемо під ваш стиль.",
  },
];

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWidget({ apiBase }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("faq"); // faq | ai
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      text:
        "Привіт! Я помічник Аліни 🙂\nМожу відповісти на типові питання про фотосесію або прийняти ваше запитання.",
      time: nowTime(),
    },
  ]);

  const boxRef = useRef(null);

  const suggested = useMemo(() => PRESET_QA, []);

  function push(role, text) {
    setMessages((prev) => [...prev, { role, text, time: nowTime() }]);
    // прокрутка вниз
    setTimeout(() => {
      const el = boxRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  function askPreset(item) {
    push("user", item.q);
    push("assistant", item.a);
    setOpen(true);
  }

  async function sendAI() {
    const q = input.trim();
    if (!q) return;

    push("user", q);
    setInput("");

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          // короткий контекст, щоб відповіді були “про фотосесію”
          context: {
            brand: "Alina Photographer",
            language: "uk",
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Помилка чату");

      push("assistant", data?.answer || "Вибач, не змогла відповісти. Спробуй переформулювати.");
    } catch (e) {
      push("assistant", "❌ " + (e?.message || "Помилка"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 9999,
        width: open ? 360 : "auto",
        maxWidth: "calc(100vw - 36px)",
        fontFamily: "inherit",
      }}
    >
      {/* Launcher */}
      {!open ? (
        <button
          className="btn"
          type="button"
          onClick={() => setOpen(true)}
          style={{
            borderRadius: 999,
            padding: "12px 14px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          }}
          title="Поставити питання"
        >
          💬 Питання?
        </button>
      ) : null}

      {/* Window */}
      {open ? (
        <div
          className="card"
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "12px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ display: "grid" }}>
              <strong style={{ lineHeight: 1.1 }}>Помічник фотографа</strong>
              <span className="muted" style={{ fontSize: 12 }}>
                FAQ + чат
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="btn"
                onClick={() => setMode((m) => (m === "faq" ? "ai" : "faq"))}
                style={{ padding: "8px 10px" }}
                title="Перемкнути режим"
              >
                {mode === "faq" ? "FAQ" : "AI"}
              </button>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setOpen(false)}
                aria-label="Закрити чат"
                title="Закрити"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: 12 }}>
            {/* Quick questions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {suggested.slice(0, 4).map((item) => (
                <button
                  key={item.q}
                  type="button"
                  className="btn"
                  onClick={() => askPreset(item)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    opacity: 0.9,
                    fontSize: 12,
                  }}
                  title={item.q}
                >
                  {item.q.length > 26 ? item.q.slice(0, 26) + "…" : item.q}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div
              ref={boxRef}
              style={{
                height: 280,
                overflow: "auto",
                paddingRight: 4,
                display: "grid",
                gap: 10,
              }}
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 12px",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background:
                        m.role === "user" ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.35,
                    }}
                  >
                    <div style={{ fontSize: 13 }}>{m.text}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                      {m.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              <input
                className="input"
                placeholder={
                  mode === "faq"
                    ? "Напиши питання (або натисни кнопку вище)"
                    : "Запитай — відповість AI"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (mode === "ai") sendAI();
                    else {
                      // у FAQ-режимі просто відобразимо підказку
                      push("user", input.trim());
                      push(
                        "assistant",
                        "Порада: натисни одну з кнопок FAQ або увімкни режим AI, щоб я відповіла на будь-яке питання 🙂"
                      );
                      setInput("");
                    }
                  }
                }}
                disabled={loading}
              />

              <button
                className="btn wide"
                type="button"
                onClick={() => (mode === "ai" ? sendAI() : null)}
                disabled={loading || mode !== "ai"}
                title={mode !== "ai" ? "Увімкни AI режим" : "Надіслати"}
              >
                {loading ? "Думаю..." : mode === "ai" ? "Надіслати" : "AI вимкнено"}
              </button>

              <div className="muted" style={{ fontSize: 11 }}>
  * AI відповідає через сервер (ключ не зберігається у браузері).
</div>

            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
