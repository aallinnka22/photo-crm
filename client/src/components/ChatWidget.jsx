import { useMemo, useRef, useState } from "react";

const PRESET_QA = [
  "Скільки триває фотосесія?",
  "Що вдягнути на зйомку?",
  "Чи допомагаєш з позуванням?",
  "Коли будуть готові фото?",
];

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWidget({ apiBase }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      text:
        "Привіт! Я AI-помічник фотографа Аліни 🙂\nМожу підказати щодо фотосесії, образу, позування, локації, термінів готовності та бронювання.",
      time: nowTime(),
    },
  ]);

  const boxRef = useRef(null);

  const suggested = useMemo(() => PRESET_QA, []);

  function scrollToBottom() {
    setTimeout(() => {
      const el = boxRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  function push(role, text) {
    setMessages((prev) => [...prev, { role, text, time: nowTime() }]);
    scrollToBottom();
  }

  async function sendMessage(messageText) {
    const q = String(messageText || "").trim();
    if (!q || loading) return;

    push("user", q);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          context: {
            brand: "Alina Photographer",
            language: "uk",
            role: "photo_assistant",
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Помилка чату");
      }

      push(
        "assistant",
        data?.answer ||
          "Вибач, не змогла відповісти. Спробуй переформулювати питання."
      );
    } catch (e) {
      push("assistant", "❌ " + (e?.message || "Помилка"));
    } finally {
      setLoading(false);
    }
  }

  function handlePresetClick(question) {
    setOpen(true);
    sendMessage(question);
  }

  function handleSubmit() {
    sendMessage(input);
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
              <strong style={{ lineHeight: 1.1 }}>AI-помічник фотографа</strong>
              <span className="muted" style={{ fontSize: 12 }}>
                Відповідає на питання про фотосесію
              </span>
            </div>

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

          <div style={{ padding: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              {suggested.slice(0, 4).map((question) => (
                <button
                  key={question}
                  type="button"
                  className="btn"
                  onClick={() => handlePresetClick(question)}
                  disabled={loading}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    opacity: 0.9,
                    fontSize: 12,
                  }}
                  title={question}
                >
                  {question.length > 26 ? question.slice(0, 26) + "…" : question}
                </button>
              ))}
            </div>

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
                    justifyContent:
                      m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 12px",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background:
                        m.role === "user"
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(255,255,255,0.06)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.35,
                    }}
                  >
                    <div style={{ fontSize: 13 }}>{m.text}</div>
                    <div
                      className="muted"
                      style={{ fontSize: 11, marginTop: 6 }}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              ))}

              {loading ? (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 12px",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.06)",
                      lineHeight: 1.35,
                      fontSize: 13,
                    }}
                  >
                    Думаю...
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              <input
                className="input"
                placeholder="Напишіть ваше питання..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSubmit();
                  }
                }}
                disabled={loading}
              />

              <button
                className="btn wide"
                type="button"
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                title="Надіслати"
              >
                {loading ? "Думаю..." : "Надіслати"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}