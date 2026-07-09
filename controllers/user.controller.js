const User = require("../models/User");

// GET /api/users/search?q=...
const searchUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const regex = new RegExp(q, "i");
    const users = await User.find({
      _id: { $ne: req.user.id }, // exclude yourself
      $or: [{ name: regex }, { email: regex }],
    }).limit(10);

    res.json({ users: users.map((u) => u.toPublic()) });
  } catch (err) {
    next(err);
  }
};

module.exports = { searchUsers };
