const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(n = 4) {
  let out = "";
  for (let i = 0; i < n; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) || "client";
}

module.exports = { randomCode, slugify };
