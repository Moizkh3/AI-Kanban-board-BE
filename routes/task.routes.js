const express = require("express");
const { listTasks, createTask, updateTask, moveTask, deleteTask } = require("../controllers/task.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireBoardMember } = require("../utils/board");

const router = express.Router({ mergeParams: true });

router.get("/",                   protect, requireBoardMember, listTasks);
router.post("/",                  protect, requireBoardMember, createTask);
router.patch("/:taskId",          protect, requireBoardMember, updateTask);
router.patch("/:taskId/move",     protect, requireBoardMember, moveTask);
router.delete("/:taskId",         protect, requireBoardMember, deleteTask);

module.exports = router;
