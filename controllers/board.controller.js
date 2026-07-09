const Board = require("../models/Board");
const Column = require("../models/Column");
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const User = require("../models/User");
const { logActivity } = require("../utils/activity");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const populateMembers = async (members) => {
  const userIds = members.map((m) => m.user_id);
  const users = await User.find({ _id: { $in: userIds } });
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
  return members.map((m) => {
    const u = userMap[m.user_id.toString()];
    return {
      id: m.user_id,
      name: u?.name || "Unknown",
      email: u?.email || "",
      avatar_url: u?.avatar_url || null,
      role: m.role,
      joined_at: m.joined_at,
    };
  });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// GET /api/boards
const listBoards = async (req, res, next) => {
  try {
    const boards = await Board.find({
      "members.user_id": req.user.id,
    }).sort({ updated_at: -1 });

    const boardIds = boards.map((b) => b._id);
    const taskCounts = await Task.aggregate([
      { $match: { board_id: { $in: boardIds } } },
      { $group: { _id: "$board_id", count: { $sum: 1 } } },
    ]);

    const taskCountMap = Object.fromEntries(
      taskCounts.map((t) => [t._id.toString(), t.count])
    );

    res.json({
      boards: boards.map((b) => ({
        id: b._id,
        title: b.title,
        description: b.description,
        color: b.color,
        owner_id: b.owner_id,
        created_at: b.created_at,
        updated_at: b.updated_at,
        is_owner: b.owner_id.toString() === req.user.id,
        task_count: taskCountMap[b._id.toString()] || 0,
        member_count: b.members.length,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/boards
const createBoard = async (req, res, next) => {
  try {
    const { title, description, color } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const board = await Board.create({
      title,
      description: description || null,
      color: color || "#2f8159",
      owner_id: req.user.id,
      members: [{ user_id: req.user.id, role: "owner", joined_at: new Date() }],
    });

    const defaultColumns = ["Todo", "In Progress", "Review", "Done"];
    await Column.insertMany(
      defaultColumns.map((t, i) => ({
        board_id: board._id,
        title: t,
        position: (i + 1) * 1000,
      }))
    );

    res.status(201).json({
      board: {
        id: board._id,
        title: board.title,
        description: board.description,
        color: board.color,
        owner_id: board.owner_id,
        created_at: board.created_at,
        updated_at: board.updated_at,
        is_owner: true,
        task_count: 0,
        member_count: 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/boards/:boardId
const getBoard = async (req, res, next) => {
  try {
    const board = req.board; // attached by requireBoardMember middleware

    const [columns, tasks, populatedMembers] = await Promise.all([
      Column.find({ board_id: board._id }).sort({ position: 1 }),
      Task.find({ board_id: board._id }).sort({ column_id: 1, position: 1 }),
      populateMembers(board.members),
    ]);

    // Populate assignees on tasks
    const assigneeIds = [
      ...new Set(
        tasks.filter((t) => t.assignee_id).map((t) => t.assignee_id.toString())
      ),
    ];
    const assignees =
      assigneeIds.length > 0 ? await User.find({ _id: { $in: assigneeIds } }) : [];
    const assigneeMap = Object.fromEntries(assignees.map((u) => [u._id.toString(), u]));

    const serializedTasks = tasks.map((t) => {
      const assignee = t.assignee_id ? assigneeMap[t.assignee_id.toString()] : null;
      return {
        id: t._id,
        board_id: t.board_id,
        column_id: t.column_id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        due_date: t.due_date,
        position: t.position,
        assignee_id: t.assignee_id,
        assignee_name: assignee?.name || null,
        assignee_email: assignee?.email || null,
        assignee_avatar: assignee?.avatar_url || null,
        created_by: t.created_by,
        created_at: t.created_at,
        updated_at: t.updated_at,
      };
    });

    res.json({
      board: {
        id: board._id,
        title: board.title,
        description: board.description,
        color: board.color,
        owner_id: board.owner_id,
        created_at: board.created_at,
        updated_at: board.updated_at,
      },
      columns: columns.map((c) => ({
        id: c._id,
        board_id: c.board_id,
        title: c.title,
        position: c.position,
        created_at: c.created_at,
      })),
      tasks: serializedTasks,
      members: populatedMembers,
      role: req.role,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/boards/:boardId
const updateBoard = async (req, res, next) => {
  try {
    const { title, description, color } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (color !== undefined) update.color = color;

    const board = await Board.findByIdAndUpdate(req.params.boardId, update, { new: true });

    await logActivity({
      boardId: req.params.boardId,
      userId: req.user.id,
      action: "board.updated",
      message: `${req.user.name} updated board settings`,
    });

    res.json({ board });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/boards/:boardId
const deleteBoard = async (req, res, next) => {
  try {
    if (req.role !== "owner") {
      return res.status(403).json({ error: "Only the board owner can delete this board" });
    }

    const id = req.params.boardId;
    await Promise.all([
      Board.findByIdAndDelete(id),
      Column.deleteMany({ board_id: id }),
      Task.deleteMany({ board_id: id }),
      Activity.deleteMany({ board_id: id }),
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/boards/:boardId/activity
const getBoardActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const activities = await Activity.find({ board_id: req.params.boardId })
      .sort({ created_at: -1 })
      .limit(limit)
      .populate("user_id", "name avatar_url");

    res.json({
      activities: activities.map((a) => ({
        id: a._id,
        board_id: a.board_id,
        user_id: a.user_id?._id,
        user_name: a.user_id?.name || "Unknown",
        user_avatar: a.user_id?.avatar_url || null,
        action: a.action,
        message: a.message,
        created_at: a.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/boards/:boardId/members
const addMember = async (req, res, next) => {
  try {
    const { email, userId, role = "member" } = req.body;
    const board = req.board;

    let targetUser;
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const alreadyMember = board.members.some(
      (m) => m.user_id.toString() === targetUser._id.toString()
    );
    if (alreadyMember) {
      return res.status(409).json({ error: "User is already a member" });
    }

    const newMember = { user_id: targetUser._id, role, joined_at: new Date() };
    board.members.push(newMember);
    await board.save();

    await logActivity({
      boardId: board._id,
      userId: req.user.id,
      action: "member.added",
      message: `${req.user.name} added ${targetUser.name} to the board`,
    });

    res.status(201).json({
      member: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        avatar_url: targetUser.avatar_url,
        role,
        joined_at: newMember.joined_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/boards/:boardId/members/:userId
const removeMember = async (req, res, next) => {
  try {
    const board = req.board;
    const targetId = req.params.userId;

    if (board.owner_id.toString() === targetId) {
      return res.status(400).json({ error: "Cannot remove the board owner" });
    }

    board.members = board.members.filter((m) => m.user_id.toString() !== targetId);
    await board.save();

    await logActivity({
      boardId: board._id,
      userId: req.user.id,
      action: "member.removed",
      message: `${req.user.name} removed a member from the board`,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listBoards,
  createBoard,
  getBoard,
  updateBoard,
  deleteBoard,
  getBoardActivity,
  addMember,
  removeMember,
};
