const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    board_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      // e.g. "task.created", "task.moved", "task.updated", "task.deleted",
      //       "column.created", "column.deleted", "member.added", "member.removed", "board.updated"
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

activitySchema.index({ board_id: 1, created_at: -1 });

module.exports = mongoose.model("Activity", activitySchema);
