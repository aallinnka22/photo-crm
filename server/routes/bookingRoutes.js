const express = require("express");
const router = express.Router();
const { createBooking, getBookings, getAvailability } = require("../controllers/bookingController");
const adminAuth = require("../middleware/adminAuth");

router.post("/", createBooking);
router.get("/availability", getAvailability);
router.get("/", adminAuth, getBookings);

module.exports = router;
