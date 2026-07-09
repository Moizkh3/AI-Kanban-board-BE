const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Task = require("../models/Task");
const Activity = require("../models/Activity");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

// Seed demo board, columns, tasks, and activity logs
const seedDemoData = async (alex) => {
  // Check if board already exists for Alex
  const existingBoard = await Board.findOne({ owner_id: alex._id });
  if (existingBoard) return;

  // 1. Create or Find teammates
  const teamSpecs = [
    { name: "Maya Chen", email: "maya@timetoprogram.com", password: "TeammatePassword123!" },
    { name: "Diego Santos", email: "diego@timetoprogram.com", password: "TeammatePassword123!" },
    { name: "Priya Nair", email: "priya@timetoprogram.com", password: "TeammatePassword123!" },
  ];

  const teammates = [];
  for (const spec of teamSpecs) {
    let t = await User.findOne({ email: spec.email });
    if (!t) {
      t = await User.create(spec);
    }
    teammates.push(t);
  }

  // 2. Create Board
  const board = await Board.create({
    title: "🚀 Product Roadmap (Demo)",
    description: "Quarterly planning, OKRs and feature prioritization.",
    color: "#2f8159",
    owner_id: alex._id,
    members: [
      { user_id: alex._id, role: "owner" },
      ...teammates.map((t) => ({ user_id: t._id, role: "member" })),
    ],
  });

  // 3. Create Columns
  const colSpecs = ["Todo", "In Progress", "Review", "Done"];
  const columns = [];
  for (let i = 0; i < colSpecs.length; i++) {
    const col = await Column.create({
      board_id: board._id,
      title: colSpecs[i],
      position: (i + 1) * 1000,
    });
    columns.push(col);
  }

  // 4. Create Tasks
  const taskSpecs = [
    {
      title: "Define Q3 OKRs",
      desc: "Define team objectives and key results for Q3.",
      priority: "high",
      colIdx: 0,
      assigneeIdx: null,
    },
    {
      title: "Prioritize backlog",
      desc: "Prune inactive features and organize roadmap.",
      priority: "medium",
      colIdx: 0,
      assigneeIdx: 0,
    },
    {
      title: "User interview synthesis",
      desc: "Extract insights from our last 5 customer calls.",
      priority: "medium",
      colIdx: 0,
      assigneeIdx: 1,
    },
    {
      title: "Stripe payment integration",
      desc: "Connect Stripe Elements checkout flow and test webhook events.",
      priority: "urgent",
      colIdx: 1,
      assigneeIdx: null,
    },
    {
      title: "Responsive layout fix",
      desc: "Fix sidebar navigation squeezing on iPad resolutions.",
      priority: "high",
      colIdx: 1,
      assigneeIdx: 2,
    },
    {
      title: "SEO audit pass",
      desc: "Check sitemap updates, schema tag validation, and lighthouse optimization.",
      priority: "medium",
      colIdx: 2,
      assigneeIdx: 0,
    },
    {
      title: "Finalize design system tokens",
      desc: "Audit token spacing names, buttons, and form UI library.",
      priority: "low",
      colIdx: 3,
      assigneeIdx: 1,
    },
  ];

  for (let i = 0; i < taskSpecs.length; i++) {
    const spec = taskSpecs[i];
    const column = columns[spec.colIdx];
    const assignee = spec.assigneeIdx !== null ? teammates[spec.assigneeIdx] : null;

    await Task.create({
      board_id: board._id,
      column_id: column._id,
      title: spec.title,
      description: spec.desc,
      priority: spec.priority,
      position: (i + 1) * 1000,
      assignee_id: assignee ? assignee._id : null,
      created_by: alex._id,
    });
  }

  // 5. Seed Activity Logs
  await Activity.insertMany([
    {
      board_id: board._id,
      user_id: alex._id,
      action: "board.created",
      message: "Alex Rivera created the board",
    },
    {
      board_id: board._id,
      user_id: alex._id,
      action: "member.added",
      message: "Alex Rivera added Maya, Diego, and Priya to the workspace",
    },
    {
      board_id: board._id,
      user_id: teammates[0]._id,
      action: "task.created",
      message: 'Maya Chen created task "Finalize design system tokens"',
    },
  ]);
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);

    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const isDemo =
      email.toLowerCase() === "alex@timetoprogram.com" && password === "Test@1234";

    let user;
    if (isDemo) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Auto-create demo user
        user = await User.create({
          name: "Alex Rivera",
          email: "alex@timetoprogram.com",
          password: "Test@1234",
        });
      }
      // Auto-seed board details
      await seedDemoData(user);
    } else {
      user = await User.findOne({ email: email.toLowerCase() }).select("+password");
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
    }

    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };

