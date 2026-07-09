const Activity = require("../models/Activity");

/**
 * Log a board activity to the database.
 * @param {object} params
 * @param {string} params.boardId
 * @param {string} params.userId
 * @param {string} params.action  - e.g. "task.created"
 * @param {string} params.message - human-readable description
 */
const logActivity = async ({ boardId, userId, action, message }) => {
  try {
    await Activity.create({
      board_id: boardId,
      user_id: userId,
      action,
      message,
    });
  } catch (err) {
    console.error("Failed to log activity:", err.message);
  }
};

module.exports = { logActivity };
