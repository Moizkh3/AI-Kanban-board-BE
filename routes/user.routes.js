const express = require("express");
const { searchUsers } = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/search", protect, searchUsers);

module.exports = router;
