const Board = require("../models/Board");

/**
 * Returns the membership entry for a user on a board, or null if not a member.
 */
const getMembership = (board, userId) => {
  return board.members.find((m) => m.user_id.toString() === userId.toString()) || null;
};

/**
 * Returns true if the user is an owner or admin of the board.
 */
const canManage = (board, userId) => {
  const m = getMembership(board, userId);
  return m && (m.role === "owner" || m.role === "admin");
};

/**
 * Middleware factory — loads board and checks membership.
 * Attaches board to req.board and membership role to req.role.
 */
const requireBoardMember = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    const membership = getMembership(board, req.user.id);
    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this board" });
    }

    req.board = board;
    req.role = membership.role;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware — requires board owner or admin role.
 * Must be used after requireBoardMember.
 */
const requireBoardAdmin = (req, res, next) => {
  if (req.role !== "owner" && req.role !== "admin") {
    return res.status(403).json({ error: "Only board owners and admins can do this" });
  }
  next();
};

module.exports = { getMembership, canManage, requireBoardMember, requireBoardAdmin };
