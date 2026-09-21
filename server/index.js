import "dotenv/config";
import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";
import multer from "multer";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
const database = process.env.MYSQL_DATABASE || "hquiz";
const mysqlConfig = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
};
let pool;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

async function initializeDatabase() {
  const admin = await mysql.createConnection(mysqlConfig);
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await admin.end();
  pool = mysql.createPool({
    ...mysqlConfig,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
  });
  await pool.query(
    `CREATE TABLE IF NOT EXISTS topics (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL UNIQUE, icon VARCHAR(10) NOT NULL DEFAULT '•', tone VARCHAR(30) NOT NULL DEFAULT 'blue', question_count INT NOT NULL DEFAULT 0, progress TINYINT UNSIGNED NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS questions (id INT AUTO_INCREMENT PRIMARY KEY, topic_id INT NOT NULL, question_text TEXT NOT NULL, options JSON NOT NULL, correct_answer TINYINT UNSIGNED NOT NULL DEFAULT 0, explanation TEXT, difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE) ENGINE=InnoDB`,
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS quiz_results (id INT AUTO_INCREMENT PRIMARY KEY, total_questions INT NOT NULL, correct_answers INT NOT NULL, duration_seconds INT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  );
}

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

app.get("/api/health", async (_req, res) =>
  res.json({ ok: Boolean(pool), database }),
);
app.get("/api/topics", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM topics ORDER BY id");
    res.json(rows);
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});
app.get("/api/questions", async (req, res) => {
  try {
    const values = [];
    let sql =
      "SELECT q.*, t.name AS topic FROM questions q JOIN topics t ON t.id = q.topic_id";
    if (req.query.topic) {
      sql += " WHERE t.name = ?";
      values.push(req.query.topic);
    }
    sql += " ORDER BY q.id DESC";
    const [rows] = await pool.query(sql, values);
    res.json(rows.map(mapQuestion));
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});
app.post("/api/questions", async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const created = [];
    for (const item of items) {
      if (!item.question || !Array.isArray(item.options)) continue;
      const [topicRows] = await pool.query(
        "SELECT id FROM topics WHERE name = ?",
        [item.topic || "Java Core"],
      );
      let topicId = topicRows[0]?.id;
      if (!topicId) {
        const [result] = await pool.query(
          "INSERT INTO topics (name) VALUES (?)",
          [item.topic || "Java Core"],
        );
        topicId = result.insertId;
      }
      const [result] = await pool.query(
        "INSERT INTO questions (topic_id, question_text, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?)",
        [
          topicId,
          item.question,
          JSON.stringify(item.options),
          Number(item.answer || 0),
          item.explanation || "",
        ],
      );
      created.push({
        id: result.insertId,
        ...item,
        topic: item.topic || "Java Core",
      });
    }
    res.status(201).json({ count: created.length, questions: created });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.delete("/api/topics/:name", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM topics WHERE name = ?", [
      req.params.name,
    ]);
    if (!result.affectedRows)
      return res.status(404).json({ error: "Không tìm thấy chủ đề." });
    res.json({ deleted: true, topic: req.params.name });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.post("/api/results", async (req, res) => {
  try {
    const { totalQuestions, correctAnswers, durationSeconds = 0 } = req.body;
    const [result] = await pool.query(
      "INSERT INTO quiz_results (total_questions, correct_answers, duration_seconds) VALUES (?, ?, ?)",
      [totalQuestions, correctAnswers, durationSeconds],
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.post("/api/import", upload.single("file"), async (_req, res) =>
  res.status(501).json({
    error:
      "Hãy phân tích file ở frontend rồi gửi danh sách câu hỏi tới /api/questions.",
  }),
);

initializeDatabase()
  .then(() =>
    app.listen(port, () =>
      console.log(`Hquiz API running at http://localhost:${port}`),
    ),
  )
  .catch((error) => {
    console.error("MySQL connection failed:", error.message);
    process.exitCode = 1;
  });
