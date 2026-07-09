const mongoose = require("mongoose");

const columnSchema = new mongoose.Schema(
  {
    board_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Column title is required"],
      trim: true,
    },
    position: {
      type: Number,
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

columnSchema.index({ board_id: 1, position: 1 });

module.exports = mongoose.model("Column", columnSchema);
