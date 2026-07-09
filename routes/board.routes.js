const express = require("express");
const {
  listBoards,
  createBoard,
  getBoard,
  updateBoard,
  deleteBoard,
  getBoardActivity,
  addMember,
  removeMember,
} = require("../controllers/board.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireBoardMember, requireBoardAdmin } = require("../utils/board");

const router = express.Router();

router.get("/",    protect, listBoards);
router.post("/",   protect, createBoard);

router.get("/:boardId",    protect, requireBoardMember, getBoard);
router.patch("/:boardId",  protect, requireBoardMember, requireBoardAdmin, updateBoard);
router.delete("/:boardId", protect, requireBoardMember, deleteBoard);

router.get("/:boardId/activity", protect, requireBoardMember, getBoardActivity);

router.post("/:boardId/members",           protect, requireBoardMember, requireBoardAdmin, addMember);
router.delete("/:boardId/members/:userId", protect, requireBoardMember, requireBoardAdmin, removeMember);

module.exports = router;
