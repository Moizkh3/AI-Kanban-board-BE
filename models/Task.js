const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    board_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    column_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Column",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    due_date: {
      type: Date,
      default: null,
    },
    position: {
      type: Number,
      required: true,
    },
    assignee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    attachments: [
      {
        attachment_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Attachment",
          required: true,
        },
        filename: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        contentType: {
          type: String,
          required: true,
        },
        uploaded_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        uploaded_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

taskSchema.index({ board_id: 1, column_id: 1, position: 1 });
taskSchema.index({ assignee_id: 1 });

module.exports = mongoose.model("Task", taskSchema);
