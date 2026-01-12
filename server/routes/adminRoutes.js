const router = require("express").Router();
const multer = require("multer");
const adminAuth = require("../middleware/adminAuth");
const ctrl = require("../controllers/adminController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post("/login", ctrl.login);

router.get("/galleries", adminAuth, ctrl.listGalleries);
router.post("/galleries", adminAuth, ctrl.createGallery);
router.get("/galleries/:id", adminAuth, ctrl.getGallery);

router.post("/galleries/:id/photos", adminAuth, upload.array("photos", 50), ctrl.uploadPhotos);
router.patch("/galleries/:id/photos/:photoId", adminAuth, ctrl.setPhotoStatus);
router.delete("/galleries/:id/photos/:photoId", adminAuth, ctrl.deletePhoto);

module.exports = router;
