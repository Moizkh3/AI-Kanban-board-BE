const Task = require("../models/Task");
const User = require("../models/User");
const { logActivity } = require("../utils/activity");

// ─── Helper ───────────────────────────────────────────────────────────────────

const withAssignee = async (task) => {
  const assignee = task.assignee_id ? await User.findById(task.assignee_id) : null;
  return {
    id: task._id,
    board_id: task.board_id,
    column_id: task.column_id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    due_date: task.due_date,
    position: task.position,
    assignee_id: task.assignee_id,
    assignee_name: assignee?.name || null,
    assignee_email: assignee?.email || null,
    assignee_avatar: assignee?.avatar_url || null,
    created_by: task.created_by,
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// GET /api/boards/:boardId/tasks
const listTasks = async (req, res, next) => {
  try {
    const filter = { board_id: req.params.boardId };
    if (req.query.column_id) filter.column_id = req.query.column_id;
    if (req.query.assignee_id) filter.assignee_id = req.query.assignee_id;
    if (req.query.priority) filter.priority = req.query.priority;

    const tasks = await Task.find(filter).sort({ column_id: 1, position: 1 });
    const serialized = await Promise.all(tasks.map(withAssignee));
    res.json({ tasks: serialized });
  } catch (err) {
    next(err);
  }
};

// POST /api/boards/:boardId/tasks
const createTask = async (req, res, next) => {
  try {
    const { title, description, priority, due_date, assignee_id, column_id } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    if (!column_id) return res.status(400).json({ error: "column_id is required" });

    // Place at end of the column
    const last = await Task.findOne({ board_id: req.params.boardId, column_id }).sort({
      position: -1,
    });
    const position = last ? last.position + 1000 : 1000;

    const task = await Task.create({
      board_id: req.params.boardId,
      column_id,
      title,
      description: description || null,
      priority: priority || "medium",
      due_date: due_date || null,
      position,
      assignee_id: assignee_id || null,
      created_by: req.user.id,
    });

    const serialized = await withAssignee(task);

    await logActivity({
      boardId: req.params.boardId,
      userId: req.user.id,
      action: "task.created",
      message: `${req.user.name} created task "${title}"`,
    });

    res.status(201).json({ task: serialized });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/boards/:boardId/tasks/:taskId
const updateTask = async (req, res, next) => {
  try {
    const allowed = ["title", "description", "priority", "due_date", "assignee_id"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, board_id: req.params.boardId },
      update,
      { new: true }
    );
    if (!task) return res.status(404).json({ error: "Task not found" });

    const serialized = await withAssignee(task);

    await logActivity({
      boardId: req.params.boardId,
      userId: req.user.id,
      action: "task.updated",
      message: `${req.user.name} updated task "${task.title}"`,
    });

    res.json({ task: serialized });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/boards/:boardId/tasks/:taskId/move
const moveTask = async (req, res, next) => {
  try {
    const { column_id, position } = req.body;
    if (!column_id || position === undefined) {
      return res.status(400).json({ error: "column_id and position are required" });
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, board_id: req.params.boardId },
      { column_id, position },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: "Task not found" });

    const serialized = await withAssignee(task);

    await logActivity({
      boardId: req.params.boardId,
      userId: req.user.id,
      action: "task.moved",
      message: `${req.user.name} moved task "${task.title}"`,
    });

    res.json({ task: serialized });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/boards/:boardId/tasks/:taskId
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.taskId,
      board_id: req.params.boardId,
    });
    if (!task) return res.status(404).json({ error: "Task not found" });

    await logActivity({
      boardId: req.params.boardId,
      userId: req.user.id,
      action: "task.deleted",
      message: `${req.user.name} deleted task "${task.title}"`,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { listTasks, createTask, updateTask, moveTask, deleteTask };
