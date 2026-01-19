const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const {
  createBooking,
  getAvailability,
  getBookings,
  adminCreateBlock,
  adminUpdateBooking,
  adminDeleteBooking,
} = require("../controllers/bookingController");

router.post("/", createBooking);
router.get("/availability", getAvailability);

// admin
router.get("/", adminAuth, getBookings);
router.post("/block", adminAuth, adminCreateBlock);
router.patch("/:id", adminAuth, adminUpdateBooking);
router.delete("/:id", adminAuth, adminDeleteBooking);

module.exports = router;
