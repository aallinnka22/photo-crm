exports.chat = async (req, res) => {
  return res.json({
    ok: true,
    answer: "Привіт! Це демо-чат. Для диплома можна підключити OpenAI API сюди.",
  });
};
