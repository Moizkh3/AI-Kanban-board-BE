const Column = require("../models/Column");
const Task = require("../models/Task");
const { logActivity } = require("../utils/activity");

// POST /api/boards/:boardId/columns
const createColumn = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    // Place at the end
    const last = await Column.findOne({ board_id: req.params.boardId }).sort({ position: -1 });
    const position = last ? last.position + 1000 : 1000;

    const column = await Column.create({
      board_id: req.params.boardId,
      title,
      position,
    });

    await logActivity({
      boardId: req.params.boardId,
      userId: req.user.id,
      action: "column.created",
      message: `${req.user.name} added column "${title}"`,
    });

    res.status(201).json({
      column: {
        id: column._id,
        board_id: column.board_id,
        title: column.title,
        position: column.position,
        created_at: column.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/boards/:boardId/columns/:columnId
const updateColumn = async (req, res, next) => {
  try {
    const { title } = req.body;
    const column = await Column.findOneAndUpdate(
      { _id: req.params.columnId, board_id: req.params.boardId },
      { title },
      { new: true }
    );
    if (!column) return res.status(404).json({ error: "Column not found" });

    res.json({
      column: {
        id: column._id,
        board_id: column.board_id,
        title: column.title,
        position: column.position,
      },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/boards/:boardId/columns/:columnId
const deleteColumn = async (req, res, next) => {
  try {
    const column = await Column.findOneAndDelete({
      _id: req.params.columnId,
      board_id: req.params.boardId,
    });
    if (!column) return res.status(404).json({ error: "Column not found" });

    // Delete all tasks inside this column
    await Task.deleteMany({ column_id: req.params.columnId });

    await logActivity({
      boardId: req.params.boardId,
      userId: req.user.id,
      action: "column.deleted",
      message: `${req.user.name} deleted column "${column.title}"`,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { createColumn, updateColumn, deleteColumn };
