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

app.get("/api/english-tests", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        qt.id,
        qt.title,
        qt.type,
        qt.description,
        qt.time_limit_minutes,
        qt.difficulty,
        et.title AS topic_title,
        COUNT(qq.id)::int AS question_count
      FROM public.quiz_tests qt
      LEFT JOIN public.english_topics et
        ON et.id = qt.english_topic_id
      LEFT JOIN public.quiz_questions qq
        ON qq.test_id = qt.id
      WHERE
        qt.english_topic_id IS NOT NULL
        AND qt.is_active = TRUE
      GROUP BY
        qt.id,
        et.title
      ORDER BY qt.id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/english-tests:", error);

    res.status(500).json({
      error: "Không tải được danh sách English Test",
    });
  }
});

app.post("/api/tests/:testId/start", async (req, res) => {
  try {
    const testId = Number(req.params.testId);

    if (!Number.isInteger(testId)) {
      return res.status(400).json({
        error: "testId không hợp lệ",
      });
    }

    const testResult = await pool.query(
      `
      SELECT
        qt.id,
        qt.title,
        qt.type,
        qt.description,
        qt.time_limit_minutes,
        qt.difficulty,
        et.title AS topic_title
      FROM public.quiz_tests qt
      LEFT JOIN public.english_topics et
        ON et.id = qt.english_topic_id
      WHERE
        qt.id = $1
        AND qt.is_active = TRUE
      LIMIT 1
      `,
      [testId],
    );

    if (!testResult.rows.length) {
      return res.status(404).json({
        error: "Không tìm thấy bài thi",
      });
    }

    const test = testResult.rows[0];

    const attemptResult = await pool.query(
      `
      INSERT INTO public.quiz_attempts (
        test_id,
        status
      )
      VALUES ($1, 'in_progress')
      RETURNING
        id,
        started_at
      `,
      [testId],
    );

    // TUYỆT ĐỐI KHÔNG SELECT correct_answer ở đây
    const questionResult = await pool.query(
      `
      SELECT
        id,
        prompt,
        options,
        difficulty
      FROM public.quiz_questions
      WHERE test_id = $1
      ORDER BY id
      `,
      [testId],
    );

    res.json({
      attemptId: attemptResult.rows[0].id,
      startedAt: attemptResult.rows[0].started_at,
      test,
      questions: questionResult.rows,
    });
  } catch (error) {
    console.error("POST start test:", error);

    res.status(500).json({
      error: "Không thể bắt đầu bài thi",
    });
  }
});

app.post("/api/tests/:testId/submit-mcq", async (req, res) => {
  try {
    const testId = Number(req.params.testId);

    const { attemptId, answers = {} } = req.body;

    if (!Number.isInteger(testId)) {
      return res.status(400).json({
        error: "testId không hợp lệ",
      });
    }

    if (!attemptId) {
      return res.status(400).json({
        error: "Thiếu attemptId",
      });
    }

    const attemptResult = await pool.query(
      `
      SELECT
        qa.id,
        qa.test_id,
        qa.status,
        qa.started_at,
        qt.time_limit_minutes
      FROM public.quiz_attempts qa
      JOIN public.quiz_tests qt
        ON qt.id = qa.test_id
      WHERE
        qa.id = $1
        AND qa.test_id = $2
      LIMIT 1
      `,
      [attemptId, testId],
    );

    if (!attemptResult.rows.length) {
      return res.status(404).json({
        error: "Không tìm thấy lượt thi",
      });
    }

    const attempt = attemptResult.rows[0];

    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        error: "Bài thi này đã được nộp",
      });
    }

    const questionResult = await pool.query(
      `
      SELECT
        id,
        prompt,
        options,
        correct_answer,
        explanation
      FROM public.quiz_questions
      WHERE test_id = $1
      ORDER BY id
      `,
      [testId],
    );

    let correct = 0;

    const details = questionResult.rows.map((question) => {
      const selected = answers[String(question.id)] ?? null;

      const isCorrect = selected === question.correct_answer;

      if (isCorrect) {
        correct += 1;
      }

      return {
        questionId: question.id,
        prompt: question.prompt,
        options: question.options,
        selected,
        correctAnswer: question.correct_answer,
        correct: isCorrect,
        explanation: question.explanation,
      };
    });

    const total = questionResult.rows.length;

    const score = total === 0 ? 0 : Math.round((correct / total) * 100);

    await pool.query(
      `
      UPDATE public.quiz_attempts
      SET
        score = $1,
        status = 'evaluated',
        submitted_at = NOW()
      WHERE id = $2
      `,
      [score, attemptId],
    );

    res.json({
      score,
      correct,
      total,
      details,
    });
  } catch (error) {
    console.error("POST submit MCQ:", error);

    res.status(500).json({
      error: "Không thể chấm bài",
    });
  }
});
