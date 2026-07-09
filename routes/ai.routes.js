const express = require("express");
const { generateTasks, breakdown, summary } = require("../controllers/ai.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireBoardMember } = require("../utils/board");

const router = express.Router({ mergeParams: true });

router.post("/generate-tasks", protect, requireBoardMember, generateTasks);
router.post("/breakdown",      protect, requireBoardMember, breakdown);
router.post("/summary",        protect, requireBoardMember, summary);

module.exports = router;
