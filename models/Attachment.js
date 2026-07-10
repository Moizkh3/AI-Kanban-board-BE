const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    board_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: "uploaded_at", updatedAt: false } }
);

attachmentSchema.index({ task_id: 1 });

module.exports = mongoose.model("Attachment", attachmentSchema);
