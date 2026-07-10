const express = require("express");
const multer = require("multer");
const {
  listTasks,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
} = require("../controllers/task.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireBoardMember } = require("../utils/board");

const router = express.Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB file size limit
  },
});

router.get("/",               protect, requireBoardMember, listTasks);
router.post("/",              protect, requireBoardMember, createTask);
router.patch("/:taskId",      protect, requireBoardMember, updateTask);
router.patch("/:taskId/move", protect, requireBoardMember, moveTask);
router.delete("/:taskId",     protect, requireBoardMember, deleteTask);

// Attachment routes
router.post("/:taskId/attachments", protect, requireBoardMember, upload.single("file"), uploadAttachment);
router.get("/:taskId/attachments/:attachmentId", protect, requireBoardMember, downloadAttachment);
router.delete("/:taskId/attachments/:attachmentId", protect, requireBoardMember, deleteAttachment);

module.exports = router;
