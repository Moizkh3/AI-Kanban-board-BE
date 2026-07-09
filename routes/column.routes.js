const express = require("express");
const { createColumn, updateColumn, deleteColumn } = require("../controllers/column.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireBoardMember, requireBoardAdmin } = require("../utils/board");

const router = express.Router({ mergeParams: true });

router.post("/",             protect, requireBoardMember, requireBoardAdmin, createColumn);
router.patch("/:columnId",   protect, requireBoardMember, requireBoardAdmin, updateColumn);
router.delete("/:columnId",  protect, requireBoardMember, requireBoardAdmin, deleteColumn);

module.exports = router;
