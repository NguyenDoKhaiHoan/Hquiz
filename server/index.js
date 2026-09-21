import "dotenv/config";
import cors from "cors";
import express from "express";
import pg from "pg";
import multer from "multer";

const { Pool } = pg;

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const PORT = process.env.PORT || 3000;

// ======================================================
// DATABASE - SUPABASE POSTGRESQL
// ======================================================

if (!process.env.DATABASE_URL) {
  console.error("❌ Thiếu biến môi trường DATABASE_URL");
  process.exit(1);
}

const isSupabase = process.env.DATABASE_URL.includes("supabase.com");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ======================================================
// INITIALIZE DATABASE
// ======================================================

async function initializeDatabase() {
  // Kiểm tra kết nối trước
  await pool.query("SELECT NOW()");

  console.log("✅ PostgreSQL connected successfully");

  // ----------------------
  // TOPICS
  // ----------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS topics (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      icon VARCHAR(10) NOT NULL DEFAULT '•',
      tone VARCHAR(30) NOT NULL DEFAULT 'blue',
      question_count INTEGER NOT NULL DEFAULT 0,
      progress SMALLINT NOT NULL DEFAULT 0
        CHECK (progress >= 0 AND progress <= 100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ----------------------
  // QUESTIONS
  // ----------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      topic_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_answer SMALLINT NOT NULL DEFAULT 0,
      explanation TEXT,
      difficulty VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT questions_topic_fk
        FOREIGN KEY (topic_id)
        REFERENCES topics(id)
        ON DELETE CASCADE
    )
  `);

  // ----------------------
  // QUIZ RESULTS
  // ----------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_results (
      id SERIAL PRIMARY KEY,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log("✅ Database tables initialized");
}

// ======================================================
// MAP QUESTION
// ======================================================

function mapQuestion(row) {
  return {
    id: row.id,
    topic: row.topic,
    question: row.question_text,
    options:
      typeof row.options === "string" ? JSON.parse(row.options) : row.options,
    answer: row.correct_answer,
    explanation: row.explanation,
    difficulty: row.difficulty,
  };
}

// ======================================================
// ROOT
// ======================================================

app.get("/", (_req, res) => {
  res.json({
    name: "Hquiz API",
    status: "running",
  });
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS time");

    res.json({
      ok: true,
      database: "PostgreSQL / Supabase",
      time: result.rows[0].time,
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: error.message,
    });
  }
});

// ======================================================
// GET TOPICS
// ======================================================

app.get("/api/topics", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.icon,
        t.tone,
        COUNT(q.id)::INTEGER AS question_count,
        t.progress,
        t.created_at
      FROM topics t
      LEFT JOIN questions q
        ON q.topic_id = t.id
      GROUP BY t.id
      ORDER BY t.id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(503).json({
      error: error.message,
    });
  }
});

// ======================================================
// GET QUESTIONS
// ======================================================

app.get("/api/questions", async (req, res) => {
  try {
    const values = [];

    let sql = `
      SELECT
        q.*,
        t.name AS topic
      FROM questions q
      JOIN topics t
        ON t.id = q.topic_id
    `;

    if (req.query.topic) {
      values.push(req.query.topic);

      sql += `
        WHERE t.name = $1
      `;
    }

    sql += `
      ORDER BY q.id DESC
    `;

    const result = await pool.query(sql, values);

    res.json(result.rows.map(mapQuestion));
  } catch (error) {
    console.error(error);

    res.status(503).json({
      error: error.message,
    });
  }
});

// ======================================================
// CREATE QUESTIONS
// ======================================================

app.post("/api/questions", async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];

    const created = [];

    for (const item of items) {
      if (!item.question || !Array.isArray(item.options)) {
        continue;
      }

      const topicName = item.topic || "Java Core";

      // Nếu topic đã tồn tại thì lấy ID.
      // Nếu chưa có thì tạo mới.
      const topicResult = await pool.query(
        `
        INSERT INTO topics (name)
        VALUES ($1)

        ON CONFLICT (name)
        DO UPDATE SET name = EXCLUDED.name

        RETURNING id
        `,
        [topicName],
      );

      const topicId = topicResult.rows[0].id;

      const difficulty = ["easy", "medium", "hard"].includes(item.difficulty)
        ? item.difficulty
        : "medium";

      const result = await pool.query(
        `
        INSERT INTO questions (
          topic_id,
          question_text,
          options,
          correct_answer,
          explanation,
          difficulty
        )
        VALUES (
          $1,
          $2,
          $3::jsonb,
          $4,
          $5,
          $6
        )
        RETURNING id
        `,
        [
          topicId,
          item.question,
          JSON.stringify(item.options),
          Number(item.answer ?? 0),
          item.explanation || "",
          difficulty,
        ],
      );

      created.push({
        id: result.rows[0].id,
        ...item,
        topic: topicName,
        difficulty,
      });
    }

    res.status(201).json({
      count: created.length,
      questions: created,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
});

// ======================================================
// DELETE TOPIC
// ======================================================

app.delete("/api/topics/:name", async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM topics
      WHERE name = $1
      `,
      [req.params.name],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Không tìm thấy chủ đề.",
      });
    }

    res.json({
      deleted: true,
      topic: req.params.name,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
});

// ======================================================
// SAVE QUIZ RESULT
// ======================================================

app.post("/api/results", async (req, res) => {
  try {
    const { totalQuestions, correctAnswers, durationSeconds = 0 } = req.body;

    const result = await pool.query(
      `
      INSERT INTO quiz_results (
        total_questions,
        correct_answers,
        duration_seconds
      )
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [Number(totalQuestions), Number(correctAnswers), Number(durationSeconds)],
    );

    res.status(201).json({
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
});

// ======================================================
// IMPORT
// ======================================================

app.post("/api/import", upload.single("file"), async (_req, res) => {
  res.status(501).json({
    error:
      "Hãy phân tích file ở frontend rồi gửi danh sách câu hỏi tới /api/questions.",
  });
});

// ======================================================
// START SERVER
// ======================================================

initializeDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Hquiz API running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ PostgreSQL connection failed:", error.message);

    process.exit(1);
  });
