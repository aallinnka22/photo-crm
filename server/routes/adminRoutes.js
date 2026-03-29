const router = require("express").Router();
const multer = require("multer");
const adminAuth = require("../middleware/adminAuth");
const ctrl = require("../controllers/adminController");
const adminOnly = require("../middleware/adminOnly");
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

// ✅ НОВЕ: видалити всю галерею
router.delete("/galleries/:id", adminAuth, ctrl.deleteGallery);

// ===== REVIEWS moderation (NEW) =====
router.get("/reviews", adminOnly, ctrl.listReviews);
router.patch("/reviews/:id", adminOnly, ctrl.setReviewStatus);
router.delete("/reviews/:id", adminOnly, ctrl.deleteReview);

module.exports = router;
