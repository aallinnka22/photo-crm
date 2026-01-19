const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/chat
router.post("/", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const ctx = req.body?.context || {};

    if (!message) return res.status(400).json({ message: "No message" });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "OPENAI_API_KEY is missing on server" });
    }

    const system = `
Ти — дружній помічник фотографа (Alina Photographer).
Мова: українська.
Твоя задача: відповідати коротко, конкретно, ввічливо.
Теми: підготовка до фотосесії, одяг, локації, позування, терміни, оплата, бронювання, приватні галереї, вибір фото на ретуш.
Якщо питання не про фотосесію — ввічливо поверни до теми або запропонуй написати напряму в Instagram.
`.trim();

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Контекст: ${JSON.stringify(ctx)}\nПитання: ${message}`,
        },
      ],
      // обмежимо, щоб відповідь була компактна
      max_output_tokens: 220,
    });

    // Витягуємо текст
    const text =
      resp.output_text ||
      "Вибач, не змогла відповісти. Спробуй переформулювати.";

    return res.json({ answer: text });
  } catch (e) {
    console.error("chat error:", e);
    return res.status(500).json({ message: "Chat error" });
  }
});

module.exports = router;
