import { useEffect, useState } from "react";
import { createBooking, getAvailability } from "../api";


export default function Booking() {
  const [form, setForm] = useState({
    clientName: "",
    contact: "",
    packageName: "Індивідуальна",
    date: "",
    time: "",
  });

  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState("");

  async function loadSlots(date) {
    if (!date) return;
    try {
      setStatus("Завантаження слотів...");
      const data = await getAvailability(date);
      setSlots(data.slots || []);
      setStatus("");
    } catch (e) {
      setStatus(e.message);
      setSlots([]);
    }
  }

  useEffect(() => {
    loadSlots(form.date);
  
  }, [form.date]);

  async function submit() {
    try {
      setStatus("Відправка...");
      const res = await createBooking(form);
      setStatus(res.message || "Дякую. Заявку надіслано.");
      setForm((p) => ({ ...p, time: "" }));
      if (form.date) await loadSlots(form.date);
    } catch (e) {
      setStatus(e.message);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <h2>Онлайн-бронювання</h2>

      <input
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 10,
          border: "1px solid #444",
          marginTop: 10,
        }}
        placeholder="Ваше імʼя"
        value={form.clientName}
        onChange={(e) => setForm({ ...form, clientName: e.target.value })}
      />

      <input
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 10,
          border: "1px solid #444",
          marginTop: 10,
        }}
        placeholder="Телефон або email"
        value={form.contact}
        onChange={(e) => setForm({ ...form, contact: e.target.value })}
      />

      <select
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 10,
          border: "1px solid #444",
          marginTop: 10,
        }}
        value={form.packageName}
        onChange={(e) => setForm({ ...form, packageName: e.target.value })}
      >
        <option value="Індивідуальна">Індивідуальна</option>
        <option value="Сімейна">Сімейна</option>
        <option value="Love story">Love story</option>
      </select>

     <input
  type="date"
  style={{
    width: "100%",
    padding: "12px",
    borderRadius: 10,
    border: "1px solid #444",
    marginTop: 10,
    backgroundColor: "#1e1e1e", 
    color: "#fff",              
    
 
    colorScheme: "dark",        
    minHeight: "48px",          
    boxSizing: "border-box"   
  }}
  value={form.date}
  onChange={(e) => setForm({ ...form, date: e.target.value, time: "" })}
/>

{form.date && (
  <div
    style={{
      marginTop: 12,
      padding: 12,
      border: "1px solid #444",
      borderRadius: 12,
    }}
  >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {slots.map((s) => (
              <button
                key={s.time}
                disabled={!s.isFree}
                onClick={() => setForm({ ...form, time: s.time })}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  cursor: s.isFree ? "pointer" : "not-allowed",
                  opacity: s.isFree ? 1 : 0.4,
                  border:
                    form.time === s.time
                      ? "2px solid #22c55e"
                      : "1px solid #444",
                  background: "transparent",
                }}
                type="button"
              >
                {s.time}
              </button>
            ))}
          </div>
          {!slots.length && (
            <p style={{ marginTop: 8, opacity: 0.8 }}>Немає даних по слотах.</p>
          )}
        </div>
      )}

      <button
        style={{
          marginTop: 12,
          width: "100%",
          padding: 12,
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
        }}
        onClick={submit}
        disabled={!form.clientName || !form.contact || !form.date || !form.time}
      >
        Забронювати
      </button>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
