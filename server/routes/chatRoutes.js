const router = require("express").Router();
const ctrl = require("../controllers/chatController");

router.post("/", ctrl.chat);

module.exports = router;