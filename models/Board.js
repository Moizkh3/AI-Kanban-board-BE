const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    joined_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Board title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    color: {
      type: String,
      default: "#2f8159",
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [memberSchema],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Index for efficient membership lookups
boardSchema.index({ "members.user_id": 1 });
boardSchema.index({ owner_id: 1 });

module.exports = mongoose.model("Board", boardSchema);
