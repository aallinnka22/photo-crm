const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

exports.chat = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const ctx = req.body?.context || {};

    if (!message) {
      return res.status(400).json({ message: "No message" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message: "GEMINI_API_KEY is missing on server",
      });
    }

    const systemPrompt = `
Ти — дружній онлайн-помічник фотографа Alina Photographer.
Мова відповіді: українська.
Стиль: коротко, конкретно, ввічливо, тепло, без зайвої води.

Твої задачі:
- відповідати на питання про фотосесії;
- допомагати з підготовкою до зйомки;
- підказувати щодо одягу, локацій, позування;
- пояснювати терміни готовності фото;
- відповідати про бронювання, оплату, приватні галереї;
- допомагати з вибором фото на ретуш.

Правила:
- не вигадуй факти, яких немає в контексті;
- якщо точної інформації немає, так і скажи;
- якщо питання не по темі фотопослуг, ввічливо поверни розмову до теми фотосесії;
- якщо потрібні точні умови, запропонуй уточнити деталі або написати напряму;
- відповідай природно, не як робот;
- не пиши занадто довго.
`.trim();

    const userPrompt = `
Контекст сайту / дані:
${JSON.stringify(ctx, null, 2)}

Питання клієнта:
${message}
`.trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\n${userPrompt}`,
    });

    const answer =
      response.text ||
      "Вибач, я не змогла підготувати відповідь. Спробуй переформулювати питання.";

    return res.json({ ok: true, answer });
  } catch (error) {
    console.error("Gemini chat error:", error);
    return res.status(500).json({
      ok: false,
      message: "Chat error",
    });
  }
};