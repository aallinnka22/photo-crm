const router = require("express").Router();
const ctrl = require("../controllers/galleryController");
const galleryAuth = require("../middleware/galleryAuth");

router.post("/login", ctrl.loginByCode);

router.get("/me/photos", galleryAuth, ctrl.getMyPhotos);
router.get("/me/photos/:photoId/download", galleryAuth, ctrl.downloadMyPhoto);
router.post("/me/selection", galleryAuth, ctrl.saveMySelection);

module.exports = router;
