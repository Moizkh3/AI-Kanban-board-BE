const { GoogleGenerativeAI } = require("@google/generative-ai");
const Task = require("../models/Task");
const Column = require("../models/Column");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getGemini = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in .env");
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return genAI.getGenerativeModel({ model: modelName });
};

// Strip markdown code fences Gemini sometimes wraps around JSON
const parseJSON = (text) => {
  const clean = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
  return JSON.parse(clean);
};

const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];
const sanitizePriority = (p) => (VALID_PRIORITIES.includes(p) ? p : "medium");

// ─── Controllers ──────────────────────────────────────────────────────────────

// POST /api/boards/:boardId/ai/generate-tasks
const generateTasks = async (req, res, next) => {
  try {
    const { goal, count = 6, column_id } = req.body;
    if (!goal || !goal.trim()) {
      return res.status(400).json({ error: "A project goal is required" });
    }

    const model = getGemini();

    const prompt = `You are a project management expert helping a team plan their work.
Given the following project goal, generate exactly ${count} actionable Kanban tasks.

Project goal: "${goal.trim()}"

Requirements:
- Each task must have: title (short, action-oriented), description (1-2 sentences), priority (one of: low, medium, high, urgent)
- Tasks should be concrete, implementable, and cover the full scope of the goal
- Return ONLY valid JSON — no explanation, no markdown

JSON format:
[
  {
    "title": "Task title here",
    "description": "Short description of what needs to be done.",
    "priority": "medium"
  }
]`;

    const result = await model.generateContent(prompt);
    const parsed = parseJSON(result.response.text());

    if (!Array.isArray(parsed)) throw new Error("AI returned an unexpected format");

    // If column_id is provided → persist tasks to DB immediately
    if (column_id) {
      const lastTask = await Task.findOne({
        board_id: req.params.boardId,
        column_id,
      }).sort({ position: -1 });

      let nextPos = lastTask ? lastTask.position + 1000 : 1000;

      const created = await Task.insertMany(
        parsed.slice(0, count).map((t) => {
          const task = {
            board_id: req.params.boardId,
            column_id,
            title: t.title || "Untitled task",
            description: t.description || null,
            priority: sanitizePriority(t.priority),
            position: nextPos,
            created_by: req.user.id,
          };
          nextPos += 1000;
          return task;
        })
      );

      return res.json({
        tasks: created.map((task) => ({
          id: task._id,
          board_id: task.board_id,
          column_id: task.column_id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          due_date: task.due_date,
          position: task.position,
          assignee_id: null,
          assignee_name: null,
          assignee_email: null,
          assignee_avatar: null,
          created_by: task.created_by,
          created_at: task.created_at,
          updated_at: task.updated_at,
        })),
      });
    }

    // No column_id → return suggestions only (preview before user confirms)
    res.json({
      tasks: parsed.slice(0, count).map((t) => ({
        title: t.title || "Untitled task",
        description: t.description || null,
        priority: sanitizePriority(t.priority),
      })),
    });
  } catch (err) {
    console.error("AI generate-tasks error:", err.message);
    next(err);
  }
};

// POST /api/boards/:boardId/ai/breakdown
const breakdown = async (req, res, next) => {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: "taskId is required" });

    const task = await Task.findOne({ _id: taskId, board_id: req.params.boardId });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const model = getGemini();

    const prompt = `You are a senior software engineer helping a team break down tasks.
Break down the following task into 3-5 concrete, actionable subtasks.

Task title: "${task.title}"
Task description: "${task.description || "No description provided"}"

Requirements:
- Each subtask must have: title (short, specific), description (1 sentence), priority (one of: low, medium, high, urgent)
- Subtasks should be ordered logically (dependencies first)
- Return ONLY valid JSON — no explanation, no markdown

JSON format:
[
  {
    "title": "Subtask title",
    "description": "What specifically needs to happen.",
    "priority": "medium"
  }
]`;

    const result = await model.generateContent(prompt);
    const parsed = parseJSON(result.response.text());

    if (!Array.isArray(parsed)) throw new Error("AI returned an unexpected format");

    res.json({
      subtasks: parsed.map((t) => ({
        title: t.title || "Subtask",
        description: t.description || null,
        priority: sanitizePriority(t.priority),
      })),
    });
  } catch (err) {
    console.error("AI breakdown error:", err.message);
    next(err);
  }
};

// POST /api/boards/:boardId/ai/summary
const summary = async (req, res, next) => {
  try {
    const boardId = req.params.boardId;

    const [columns, tasks] = await Promise.all([
      Column.find({ board_id: boardId }).sort({ position: 1 }),
      Task.find({ board_id: boardId }).sort({ column_id: 1, position: 1 }),
    ]);

    if (tasks.length === 0) {
      return res.json({
        summary: {
          headline: "This board has no tasks yet. Add some tasks to get a sprint summary.",
          completed: [],
          inProgress: [],
          risks: [],
          recommendations: ["Add tasks to this board to get AI insights."],
        },
      });
    }

    // Group tasks by their column title
    const colMap = Object.fromEntries(columns.map((c) => [c._id.toString(), c.title]));
    const grouped = {};
    for (const task of tasks) {
      const colTitle = colMap[task.column_id.toString()] || "Unknown";
      if (!grouped[colTitle]) grouped[colTitle] = [];
      grouped[colTitle].push(`- [${task.priority}] ${task.title}`);
    }

    const boardOverview = Object.entries(grouped)
      .map(([col, items]) => `## ${col}\n${items.join("\n")}`)
      .join("\n\n");

    const model = getGemini();

    const prompt = `You are an experienced agile coach analyzing a Kanban board.
Based on the following board data, generate a structured sprint summary report.

Board snapshot:
${boardOverview}

Instructions:
- Identify completed items (tasks in "Done" column)
- Identify work in progress
- Identify risks/blockers (urgent items or patterns that suggest issues)
- Provide 2-3 actionable recommendations
- Write a single headline sentence summarizing sprint health

Return ONLY valid JSON — no explanation, no markdown:
{
  "headline": "One sentence sprint status summary.",
  "completed": ["item 1", "item 2"],
  "inProgress": ["item 1", "item 2"],
  "risks": ["risk 1", "risk 2"],
  "recommendations": ["action 1", "action 2"]
}`;

    const result = await model.generateContent(prompt);
    const parsed = parseJSON(result.response.text());

    res.json({ summary: parsed });
  } catch (err) {
    console.error("AI summary error:", err.message);
    next(err);
  }
};

module.exports = { generateTasks, breakdown, summary };
