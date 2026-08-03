const router = require("express").Router();

const galleryAuth = require("../middleware/galleryAuth"); // <-- якщо в тебе шлях інший, дивись нижче
const ctrl = require("../controllers/galleryController");

// ✅ Діагностика: щоб одразу бачити що undefined і що реально експортується
function mustFn(fn, name) {
  if (typeof fn !== "function") {
    const keys = Object.keys(ctrl || {});
    throw new Error(
      `${name} is not a function. typeof=${typeof fn}. ` +
        `galleryController exports: ${keys.join(", ") || "(none)"}`,
    );
  }
  return fn;
}

router.post("/login", mustFn(ctrl.loginByCode, "ctrl.loginByCode"));

router.get(
  "/me/photos",
  mustFn(galleryAuth, "galleryAuth"),
  mustFn(ctrl.getMyPhotos, "ctrl.getMyPhotos"),
);

router.post(
  "/me/selection",
  mustFn(galleryAuth, "galleryAuth"),
  mustFn(ctrl.saveMySelection, "ctrl.saveMySelection"),
);

router.get(
  "/me/photos/:photoId/download",
  mustFn(galleryAuth, "galleryAuth"),
  mustFn(ctrl.downloadMyPhoto, "ctrl.downloadMyPhoto"),
);


router.post("/logout", mustFn(ctrl.logout, "ctrl.logout"));

module.exports = router;
