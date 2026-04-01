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
      text: "Привіт! Я AI-помічник фотографа Аліни 🙂\nМожу підказати щодо фотосесії, образу, позування, локації, термінів готовності та бронювання.",
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

    const nextMessages = [
      ...messages,
      { role: "user", text: q, time: nowTime() },
    ];

    push("user", q);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          messages: nextMessages.map(({ role, text }) => ({ role, text })),
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
          "Вибач, не зміг відповісти. Спробуй переформулювати питання.",
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
    <div className={`chat-widget ${open ? "is-open" : ""}`}>
      {!open ? (
        <button
          className="btn chat-widget-toggle"
          type="button"
          onClick={() => setOpen(true)}
          title="Поставити питання"
        >
          💬 Питання?
        </button>
      ) : null}

      {open ? (
        <div className="card chat-widget-card">
          <div className="chat-widget-head">
            <div className="chat-widget-head-text">
              <strong className="chat-widget-title">AI-помічник фотографа</strong>
              <span className="muted chat-widget-subtitle">
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

          <div className="chat-widget-body">
            <div className="chat-widget-suggested">
              {suggested.slice(0, 4).map((question) => (
                <button
                  key={question}
                  type="button"
                  className="btn chat-widget-suggested-btn"
                  onClick={() => handlePresetClick(question)}
                  disabled={loading}
                  title={question}
                >
                  {question.length > 26
                    ? question.slice(0, 26) + "…"
                    : question}
                </button>
              ))}
            </div>

            <div ref={boxRef} className="chat-widget-messages">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`chat-widget-row ${m.role === "user" ? "is-user" : "is-assistant"}`}
                >
                  <div
                    className={`chat-widget-bubble ${m.role === "user" ? "is-user" : "is-assistant"}`}
                  >
                    <div className="chat-widget-message-text">{m.text}</div>
                    <div className="muted chat-widget-message-time">
                      {m.time}
                    </div>
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="chat-widget-row is-assistant">
                  <div className="chat-widget-bubble is-assistant chat-widget-thinking">
                    Думаю...
                  </div>
                </div>
              ) : null}
            </div>

            <div className="chat-widget-form">
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