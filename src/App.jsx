import { useEffect, useRef, useState } from "react";
import mammoth from "mammoth/mammoth.browser";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileUp,
  Filter,
  LayoutDashboard,
  Library,
  Languages,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import "./App.css";
import EnglishModule from "./components/EnglishModule";

const topics = [
  { name: "Java Core", icon: "☕", tone: "cream" },
  { name: "OOP & Design Pattern", icon: "◈", tone: "mint" },
  { name: "SQL & Database", icon: "▦", tone: "blue" },
  { name: "Spring Framework", icon: "✳", tone: "orange" },
];
const seedQuestions = [];
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const QUESTIONS_STORAGE_KEY = "hquiz.questions";
const PROGRESS_STORAGE_KEY = "hquiz.progress";
const initialProgress = {
  completedQuestions: 0,
  correctAnswers: 0,
  streak: 0,
  byTopic: {},
  answered: {},
  activities: [],
};

function QuizScreen({
  topic,
  questions,
  index,
  current,
  answer,
  setAnswer,
  finished,
  score,
  answers,
  onBack,
  onPrevious,
  canPrevious,
  onJump,
  onNext,
  onRestart,
  onShuffle,
}) {
  if (!questions.length || !current) {
    return (
      <div className="quiz-screen">
        <button className="back-link" onClick={onBack}>
          <ArrowRight size={16} className="back-arrow" /> Quay lại không gian
          học
        </button>
        <div className="quiz-result empty-quiz">
          <div className="result-icon">
            <BookOpen size={28} />
          </div>
          <p className="eyebrow">CHỦ ĐỀ CHƯA CÓ CÂU HỎI</p>
          <h1>{topic}</h1>
          <p className="muted">
            Hãy nhập file câu hỏi có chứa chủ đề này, sau đó quay lại để bắt đầu
            ôn tập.
          </p>
          <button className="primary-button" onClick={onBack}>
            Quay lại và nhập câu hỏi <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }
  if (finished) {
    return (
      <div className="quiz-screen">
        <button className="back-link" onClick={onBack}>
          <ArrowRight size={16} className="back-arrow" /> Quay lại không gian
          học
        </button>
        <div className="quiz-result">
          <div className="result-icon">
            <Check size={28} />
          </div>
          <p className="eyebrow">HOÀN THÀNH BÀI ÔN TẬP</p>
          <h1>{topic}</h1>
          <p className="result-score">
            {score} <span>/ {questions.length}</span>
          </p>
          <p className="muted">
            Bạn đã hoàn thành toàn bộ câu hỏi của chủ đề này.
          </p>
          <div className="result-actions">
            <button className="secondary-button" onClick={onRestart}>
              Làm lại chủ đề
            </button>
            <button className="secondary-button" onClick={onShuffle}>
              Đảo câu hỏi
            </button>
            <button className="primary-button" onClick={onBack}>
              Về trang tổng quan <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }
  const progress = ((index + 1) / questions.length) * 100;
  return (
    <div className="quiz-screen">
      <button className="back-link" onClick={onBack}>
        <ArrowRight size={16} className="back-arrow" /> Quay lại không gian học
      </button>
      <div className="quiz-screen-heading">
        <div>
          <p className="eyebrow">BÀI ÔN TẬP THEO CHỦ ĐỀ</p>
          <h1>{topic}</h1>
          <p className="muted">
            Tập trung làm bài, xem giải thích sau mỗi câu trả lời.
          </p>
        </div>
        <div className="quiz-timer">
          <Clock3 size={17} /> Không giới hạn thời gian
        </div>
      </div>
      <div className="quiz-progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="quiz-progress-label">
        <span>
          Câu {index + 1} / {questions.length}
        </span>
        <span>{Math.round(progress)}% hoàn thành</span>
      </div>
      <div className="question-navigator" aria-label="Điều hướng câu hỏi">
        {questions.map((question, questionIndex) => (
          <button
            key={question.id}
            className={`${questionIndex === index ? "current" : ""} ${answers[questionIndex] !== undefined ? "answered" : ""}`}
            onClick={() => onJump(questionIndex)}
            aria-label={`Mở câu ${questionIndex + 1}`}
          >
            {questionIndex + 1}
          </button>
        ))}
      </div>
      <section className="quiz-question-card">
        <div className="quiz-question-meta">
          <span>{topic}</span>
          <span>Câu hỏi {index + 1}</span>
        </div>
        <h2>{current.question}</h2>
        <div className="screen-options">
          {current.options.map((option, optionIndex) => (
            <button
              key={option}
              className={`screen-option ${answer === optionIndex ? (optionIndex === current.answer ? "correct" : "wrong") : ""}`}
              onClick={() => setAnswer(optionIndex)}
            >
              <span>{String.fromCharCode(65 + optionIndex)}</span>
              <b>{option}</b>
              {answer === optionIndex && optionIndex === current.answer && (
                <Check size={18} />
              )}
            </button>
          ))}
        </div>
        {answer !== null && (
          <div
            className={`screen-explanation ${answer === current.answer ? "is-correct" : "is-wrong"}`}
          >
            <Sparkles size={17} />
            <span>
              {answer === current.answer ? (
                <b>Chính xác. </b>
              ) : (
                <>
                  <b>Chưa chính xác. </b>Bạn chọn{" "}
                  <strong>
                    {String.fromCharCode(65 + answer)}.{" "}
                    {current.options[answer]}
                  </strong>
                  , đáp án đúng là{" "}
                  <strong>
                    {String.fromCharCode(65 + current.answer)}.{" "}
                    {current.options[current.answer]}
                  </strong>
                  .{" "}
                </>
              )}
              {current.explanation ? (
                <>
                  <b>Giải thích:</b> {current.explanation}
                </>
              ) : (
                "Chưa có phần giải thích trong file cho câu này."
              )}
            </span>
          </div>
        )}
        <div className="screen-footer">
          <span>
            {answer === null
              ? "Hãy chọn một đáp án"
              : answer === current.answer
                ? "Đáp án chính xác"
                : "Đáp án chưa chính xác"}
          </span>
          <div className="quiz-nav-actions">
            <button
              className="secondary-button"
              disabled={!canPrevious}
              onClick={onPrevious}
            >
              Câu trước
            </button>
            <button
              className="primary-button"
              disabled={answer === null}
              onClick={onNext}
            >
              {index + 1 === questions.length
                ? "Hoàn thành bài"
                : "Câu tiếp theo"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

function mergeQuestions(current, incoming) {
  // Gom chủ đề trùng tên (không phân biệt hoa/thường, thừa khoảng trắng)
  const topicNames = new Map();
  current.forEach((item) => {
    const key = normalizeText(item.topic);
    if (!topicNames.has(key)) topicNames.set(key, item.topic);
  });
  // Nhận diện câu đã có: cùng chủ đề + cùng nội dung câu hỏi
  const seen = new Set(
    current.map(
      (item) => `${normalizeText(item.topic)}|${normalizeText(item.question)}`,
    ),
  );
  const added = [];
  for (const item of incoming) {
    const topicKey = normalizeText(item.topic);
    const topic = topicNames.get(topicKey) || String(item.topic).trim();
    topicNames.set(topicKey, topic);
    const duplicateKey = `${topicKey}|${normalizeText(item.question)}`;
    if (seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);
    added.push({ ...item, topic });
  }
  return {
    merged: [...current, ...added],
    added,
    skipped: incoming.length - added.length,
  };
}

function App() {
  const [page, setPage] = useState("Tổng quan");
  const [questions, setQuestions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(QUESTIONS_STORAGE_KEY) || "[]");
    } catch {
      return seedQuestions;
    }
  });
  const [progress, setProgress] = useState(() => {
    try {
      return {
        ...initialProgress,
        ...JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || "{}"),
      };
    } catch {
      return initialProgress;
    }
  });
  const [topic, setTopic] = useState("Tất cả chủ đề");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [upload, setUpload] = useState({ status: "idle", text: "" });
  const [answer, setAnswer] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizTopic, setQuizTopic] = useState("Tất cả chủ đề");
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizOrder, setQuizOrder] = useState([]);
  const fileInput = useRef(null);
  const filteredQuizQuestions = questions.filter(
    (item) => quizTopic === "Tất cả chủ đề" || item.topic === quizTopic,
  );
  const quizQuestions = quizOrder.length
    ? quizOrder
        .map((id) => questions.find((item) => item.id === id))
        .filter(Boolean)
    : filteredQuizQuestions;
  const current = quizQuestions[quizIndex % quizQuestions.length] || {
    topic: "Chưa có chủ đề",
    question: "Chưa có câu hỏi. Hãy nhập file để bắt đầu ôn tập.",
    options: [],
    answer: -1,
    explanation: "",
  };
  const topicCards = Array.from(
    new Set(questions.map((item) => item.topic)),
  ).map((name, index) => {
    const base = topics.find((item) => item.name === name);
    return {
      name,
      count: questions.filter((item) => item.topic === name).length,
      icon: base?.icon || "•",
      tone: base?.tone || ["cream", "mint", "blue", "orange"][index % 4],
      progress: Math.min(
        100,
        Math.round(
          ((progress.byTopic[name]?.completed || 0) /
            questions.filter((item) => item.topic === name).length) *
            100,
        ),
      ),
    };
  });
  const filtered = questions.filter(
    (item) =>
      (topic === "Tất cả chủ đề" || item.topic === topic) &&
      item.question.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    try {
      const storedQuestions = JSON.parse(
        localStorage.getItem(QUESTIONS_STORAGE_KEY) || "[]",
      );
      if (storedQuestions.length) return;
    } catch {
      localStorage.removeItem(QUESTIONS_STORAGE_KEY);
    }
    fetch(`${API_URL}/api/questions`)
      .then((response) => (response.ok ? response.json() : []))
      .then((items) => {
        if (items.length) setQuestions(items);
      })
      .catch(() => {});
  }, []);

  function startQuiz(selectedTopic) {
    const selectedQuestions = questions.filter(
      (item) => item.topic === selectedTopic,
    );
    const answered = progress.answered || {};
    const shuffledQuestions = [...selectedQuestions].sort(
      () => Math.random() - 0.5,
    );
    setQuizOrder(shuffledQuestions.map((item) => item.id));
    const firstUnanswered = shuffledQuestions.findIndex(
      (item) => !answered[String(item.id)],
    );
    const resumeIndex =
      firstUnanswered === -1
        ? Math.max(selectedQuestions.length - 1, 0)
        : firstUnanswered;
    const savedAnswers = Object.fromEntries(
      shuffledQuestions
        .map((item, index) => [index, answered[String(item.id)]?.selected])
        .filter(([, value]) => value !== undefined),
    );
    setQuizTopic(selectedTopic);
    setQuizIndex(resumeIndex);
    setQuizScore(0);
    setQuizFinished(false);
    setQuizAnswers(savedAnswers);
    setAnswer(savedAnswers[resumeIndex] ?? null);
    setPage("Làm bài");
  }

  function restartQuiz(shuffle = true) {
    const selectedQuestions = questions.filter(
      (item) => item.topic === quizTopic,
    );
    const nextQuestions = shuffle
      ? [...selectedQuestions].sort(() => Math.random() - 0.5)
      : selectedQuestions;
    setQuizOrder(nextQuestions.map((item) => item.id));
    setQuizIndex(0);
    setQuizScore(0);
    setQuizFinished(false);
    setQuizAnswers({});
    setAnswer(null);
  }

  function chooseQuizAnswer(value) {
    setAnswer(value);
    setQuizAnswers((previous) => ({ ...previous, [quizIndex]: value }));
    const questionKey = String(current.id);
    setProgress((previous) => {
      const answered = previous.answered || {};
      const previousAnswer = answered[questionKey];
      const topicProgress = previous.byTopic[current.topic] || {
        completed: 0,
        correct: 0,
      };
      const correctDelta =
        (value === current.answer ? 1 : 0) - (previousAnswer?.correct ? 1 : 0);
      return {
        ...previous,
        completedQuestions:
          previous.completedQuestions + (previousAnswer ? 0 : 1),
        correctAnswers: previous.correctAnswers + correctDelta,
        answered: {
          ...answered,
          [questionKey]: {
            topic: current.topic,
            selected: value,
            correct: value === current.answer,
          },
        },
        byTopic: {
          ...previous.byTopic,
          [current.topic]: {
            completed: topicProgress.completed + (previousAnswer ? 0 : 1),
            correct: topicProgress.correct + correctDelta,
          },
        },
      };
    });
  }

  function handleQuizPrevious() {
    if (quizIndex === 0) return;
    const previousIndex = quizIndex - 1;
    setQuizIndex(previousIndex);
    setAnswer(quizAnswers[previousIndex] ?? null);
  }

  function handleQuizJump(nextIndex) {
    setQuizIndex(nextIndex);
    setAnswer(quizAnswers[nextIndex] ?? null);
  }

  function handleQuizNext() {
    const updatedAnswers = { ...quizAnswers, [quizIndex]: answer };
    const nextScore = quizQuestions.reduce(
      (total, question, questionIndex) =>
        total + (updatedAnswers[questionIndex] === question.answer ? 1 : 0),
      0,
    );
    if (quizIndex + 1 >= quizQuestions.length) {
      setQuizScore(nextScore);
      setQuizFinished(true);
      setProgress((previous) => ({
        ...previous,
        streak: previous.streak + 1,
        activities: [
          {
            topic: quizTopic,
            score: nextScore,
            total: quizQuestions.length,
            createdAt: new Date().toISOString(),
          },
          ...previous.activities,
        ].slice(0, 8),
      }));
      fetch(`${API_URL}/api/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalQuestions: quizQuestions.length,
          correctAnswers: nextScore,
        }),
      }).catch(() => {});
      return;
    }
    setQuizAnswers(updatedAnswers);
    setQuizScore(nextScore);
    setQuizIndex((value) => value + 1);
    setAnswer(updatedAnswers[quizIndex + 1] ?? null);
  }

  function parseText(text) {
    const lines = text
      .replace(/\r/g, "")
      .replace(/\t/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const questions = [];
    const answerExplanations = new Map();
    let activeTopic = "Chưa phân loại";
    let currentQuestion = null;
    let answerMode = false;
    const isTopicHeading = (line) =>
      /^(chủ đề|topic|phần|chapter)\b/i.test(line) ||
      /^(?:[1-7]|[IVX]+)[.)]\s+.*(?:\d+\s*câu|questions?)/i.test(line);
    const cleanTopic = (line) =>
      line
        .replace(/^(chủ đề|topic|phần|chapter)\s*(?:\d+)?\s*[:.)-]?\s*/i, "")
        .replace(/^(?:[1-7]|[IVX]+)[.)]\s*/i, "")
        .replace(/\s*[—-]\s*\d+\s*câu.*$/i, "")
        .trim();
    const saveQuestion = () => {
      if (currentQuestion?.question && currentQuestion.options.length)
        questions.push({
          ...currentQuestion,
          id: Date.now() + questions.length,
        });
    };
    let readingExplanation = false;
    for (const line of lines) {
      if (/^đáp án\s*&\s*giải thích\b/i.test(line)) {
        saveQuestion();
        currentQuestion = null;
        answerMode = true;
        readingExplanation = false;
        continue;
      }
      if (isTopicHeading(line)) {
        saveQuestion();
        currentQuestion = null;
        answerMode = false;
        readingExplanation = false;
        activeTopic = cleanTopic(line);
        continue;
      }
      if (answerMode) {
        const answerExplanation = line.match(
          /^câu\s*(\d+)\s*[:.)-]\s*([A-D])\s*[.):-]\s*(.+)$/i,
        );
        if (answerExplanation)
          answerExplanations.set(Number(answerExplanation[1]), {
            answer: answerExplanation[2].toUpperCase().charCodeAt(0) - 65,
            explanation: answerExplanation[3].trim(),
          });
        continue;
      }
      const questionMatch = line.match(/^(?:câu\s*)?(\d+)\s*[.):-]\s*(.+)$/i);
      if (questionMatch) {
        saveQuestion();
        readingExplanation = false;
        currentQuestion = {
          number: Number(questionMatch[1]),
          topic: activeTopic,
          question: questionMatch[2].trim(),
          options: [],
          answer: 0,
          explanation: "",
        };
        continue;
      }
      const optionMatch = line.match(/^([A-D])\s*[.):-]\s*(.+)$/i);
      if (optionMatch && currentQuestion) {
        currentQuestion.options.push(optionMatch[2].trim());
        readingExplanation = false;
        continue;
      }
      const answerOnLine = line.match(
        /^(?:đáp án|answer).*?[:：]\s*([A-D])\b/i,
      );
      if (answerOnLine && currentQuestion)
        currentQuestion.answer =
          answerOnLine[1].toUpperCase().charCodeAt(0) - 65;
      const explanationMatch = line.match(
        /(?:giải thích|explanation)[^:：.-]*[:：.-]?\s*(.*)$/i,
      );
      if (explanationMatch && currentQuestion) {
        currentQuestion.explanation = explanationMatch[1].trim();
        readingExplanation = true;
        continue;
      }
      if (/^(đáp án|answer)\b/i.test(line) && currentQuestion) {
        const answerText =
          line
            .split(/[:：.)-]/)
            .slice(1)
            .join(" ") || line;
        const letter = answerText.match(/[A-D]/i)?.[0];
        if (letter)
          currentQuestion.answer = letter.toUpperCase().charCodeAt(0) - 65;
        const inlineExplanation = answerText
          .replace(/^[A-D]\s*[.):-]?\s*/i, "")
          .trim();
        if (inlineExplanation) currentQuestion.explanation = inlineExplanation;
        readingExplanation = true;
        continue;
      }
      if (currentQuestion && readingExplanation) {
        currentQuestion.explanation =
          `${currentQuestion.explanation} ${line}`.trim();
        continue;
      }
      if (currentQuestion && currentQuestion.options.length === 0)
        currentQuestion.question += ` ${line}`;
    }
    saveQuestion();
    return questions.map((question) => {
      const answerExplanation = answerExplanations.get(question.number);
      return answerExplanation
        ? {
            ...question,
            answer: answerExplanation.answer,
            explanation: answerExplanation.explanation,
          }
        : question;
    });
  }
  async function handleFile(file) {
    if (!file) return;
    setUpload({ status: "reading", text: file.name });
    try {
      const isJson = file.name.toLowerCase().endsWith(".json");
      const text = file.name.toLowerCase().endsWith(".docx")
        ? (
            await mammoth.extractRawText({
              arrayBuffer: await file.arrayBuffer(),
            })
          ).value
        : await file.text();
      const jsonItems = isJson ? JSON.parse(text) : null;
      const imported = isJson
        ? (Array.isArray(jsonItems)
            ? jsonItems
            : jsonItems.questions || []
          ).map((item, index) => ({
            id: Date.now() + index,
            topic: item.topic || "Java Core",
            question: item.question || item.content || "",
            options: item.options ||
              item.choices || ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
            answer:
              typeof item.answer === "number"
                ? item.answer
                : Math.max(
                    0,
                    String(item.answer || "A")
                      .toUpperCase()
                      .charCodeAt(0) - 65,
                  ),
            explanation: item.explanation || "",
          }))
        : parseText(text);
      if (!imported.length)
        setUpload({
          status: "error",
          text: "Chưa nhận diện được câu hỏi trong file.",
        });
      else {
        const explanationCount = imported.filter((item) =>
          item.explanation.trim(),
        ).length;
        const { merged, added, skipped } = mergeQuestions(questions, imported);
        setQuestions(merged);
        setTopic("Tất cả chủ đề");
        setQuizTopic("Tất cả chủ đề");
        setQuizIndex(0);
        setQuizAnswers({});
        setAnswer(null);
        if (added.length)
          fetch(`${API_URL}/api/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(added),
          }).catch(() => {});
        setUpload({
          status: "success",
          text: `Đã thêm ${added.length} câu hỏi${skipped ? `, bỏ qua ${skipped} câu trùng` : ""} từ ${file.name}; tổng hiện có ${merged.length} câu. Đọc được giải thích ở ${explanationCount} câu.`,
        });
      }
    } catch {
      setUpload({ status: "error", text: "Không thể đọc file này." });
    }
  }
  async function deleteTopic(event, topicName) {
    event.stopPropagation();
    if (
      !window.confirm(`Xóa chủ đề "${topicName}" và toàn bộ câu hỏi bên trong?`)
    )
      return;
    setQuestions((items) => items.filter((item) => item.topic !== topicName));
    if (topic === topicName) setTopic("Tất cả chủ đề");
    if (quizTopic === topicName) setQuizTopic("Tất cả chủ đề");
    try {
      const response = await fetch(
        `${API_URL}/api/topics/${encodeURIComponent(topicName)}`,
        { method: "DELETE" },
      );
      if (!response.ok)
        throw new Error("Không thể xóa chủ đề trong cơ sở dữ liệu.");
    } catch (error) {
      setUpload({ status: "error", text: error.message });
    }
  }
  function navigateSection(label) {
    setPage(label);
    const target =
      label === "Thư viện câu hỏi"
        ? ".question-library"
        : label === "Chủ đề"
          ? ".section-block"
          : label === "Kết quả"
            ? ".activity-panel"
            : ".content-wrap";
    requestAnimationFrame(() =>
      document
        .querySelector(target)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  const nav = [
    {
      label: "Tổng quan",
      icon: LayoutDashboard,
    },
    {
      label: "Thư viện câu hỏi",
      icon: Library,
    },
    {
      label: "Chủ đề",
      icon: BookOpen,
    },
    {
      label: "English Test",
      icon: Languages,
    },
    {
      label: "Kết quả",
      icon: BarChart3,
    },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">H</span>
          <span>Hquiz</span>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-dot">H</span>
          <span>
            <small>WORKSPACE</small>FPT Software Intern
          </span>
          <ChevronDown size={15} />
        </div>
        <nav className="main-nav">
          <span className="nav-label">KHÔNG GIAN HỌC</span>
          {nav.map(({ label, icon: Icon }) => (
            <button
              className={page === label ? "nav-item active" : "nav-item"}
              onClick={() => navigateSection(label)}
              key={label}
            >
              <Icon size={18} />
              {label}
              {label === "Kết quả" && <span className="nav-badge">3</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item">
            <Settings2 size={18} />
            Cài đặt
          </button>
          <div className="profile">
            <span className="avatar">NT</span>
            <span>
              <b>Nguyễn Tuấn</b>
              <small>Người học</small>
            </span>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>
      <main className="main-content">
        {page === "Làm bài" ? (
          <QuizScreen
            topic={quizTopic}
            questions={quizQuestions}
            index={quizIndex}
            current={current}
            answer={answer}
            setAnswer={chooseQuizAnswer}
            finished={quizFinished}
            score={quizScore}
            answers={quizAnswers}
            onBack={() => setPage("Tổng quan")}
            onPrevious={handleQuizPrevious}
            canPrevious={quizIndex > 0}
            onJump={handleQuizJump}
            onRestart={() => restartQuiz(false)}
            onShuffle={() => restartQuiz(true)}
            onNext={handleQuizNext}
          />
        ) : page === "English Test" ? (
          <EnglishModule onBack={() => setPage("Tổng quan")} />
        ) : (
          <>
            <header className="topbar">
              <div className="breadcrumbs">
                <span>Không gian học</span>
                <ArrowRight size={14} />
                <b>{page}</b>
              </div>
              <div className="top-actions">
                <span className="streak">🔥 7 ngày liên tiếp</span>
                <button className="icon-button">
                  <CircleHelp size={19} />
                </button>
                <span className="header-avatar">NT</span>
              </div>
            </header>
            <div className="content-wrap">
              <section className="welcome-row">
                <div>
                  <p className="eyebrow">THỨ TƯ, 20 THÁNG 9, 2026</p>
                  <h1>
                    Chào buổi sáng, Tuấn <span>✦</span>
                  </h1>
                  <p className="muted">
                    Sẵn sàng chinh phục mục tiêu hôm nay chưa?
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload size={17} /> Nhập câu hỏi
                </button>
              </section>
              <section className="stats-grid">
                {[
                  [
                    "warm",
                    Target,
                    "Tổng câu hỏi",
                    String(questions.length),
                    "câu",
                  ],
                  [
                    "cool",
                    Clock3,
                    "Đã hoàn thành",
                    String(progress.completedQuestions),
                    "câu",
                  ],
                  [
                    "green",
                    Check,
                    "Tỷ lệ chính xác",
                    String(
                      progress.completedQuestions
                        ? Math.round(
                            (progress.correctAnswers /
                              progress.completedQuestions) *
                              100,
                          )
                        : 0,
                    ),
                    "%",
                  ],
                  [
                    "coral",
                    Sparkles,
                    "Chuỗi hiện tại",
                    String(progress.streak),
                    "bài",
                  ],
                ].map(([tone, Icon, label, value, unit]) => (
                  <div className="stat-card" key={label}>
                    <div className={`stat-icon ${tone}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <span>{label}</span>
                      <strong>
                        {value} <small>{unit}</small>
                      </strong>
                    </div>
                    <div className={`sparkline ${tone}-line`}>↗</div>
                  </div>
                ))}
              </section>
              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <h2>Tiếp tục học</h2>
                    <p className="muted">Các chủ đề bạn đang theo dõi</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setPage("Chủ đề")}
                  >
                    Xem tất cả <ArrowRight size={15} />
                  </button>
                </div>
                <div className="topic-grid">
                  {topicCards.map((item) => (
                    <div
                      className="topic-card"
                      key={item.name}
                      onClick={() => {
                        setTopic(item.name);
                        startQuiz(item.name);
                      }}
                    >
                      <div className={`topic-symbol ${item.tone}`}>
                        {item.icon}
                      </div>
                      <div className="topic-card-copy">
                        <div className="topic-title">
                          <b>{item.name}</b>
                          <ArrowRight size={16} />
                        </div>
                        <span>{item.count} câu hỏi</span>
                        <div className="progress-track">
                          <span style={{ width: `${item.progress}%` }} />
                        </div>
                        <small>{item.progress}% hoàn thành</small>
                      </div>
                      <button
                        className="topic-delete"
                        title={`Xóa ${item.name}`}
                        aria-label={`Xóa ${item.name}`}
                        onClick={(event) => deleteTopic(event, item.name)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <div className="lower-grid">
                <section className="quiz-panel">
                  <div className="section-heading">
                    <div>
                      <h2>Luyện tập nhanh</h2>
                      <p className="muted">
                        Ôn lại kiến thức với một câu hỏi ngẫu nhiên
                      </p>
                    </div>
                    <div className="quiz-controls">
                      <select
                        value={quizTopic}
                        onChange={(event) => {
                          setQuizTopic(event.target.value);
                          setQuizIndex(0);
                          setQuizAnswers({});
                          setAnswer(null);
                        }}
                      >
                        <option>Tất cả chủ đề</option>
                        {topicCards.map((item) => (
                          <option key={item.name}>{item.name}</option>
                        ))}
                      </select>
                      <span className="question-count">
                        {quizQuestions.length
                          ? (quizIndex % quizQuestions.length) + 1
                          : 0}{" "}
                        / {quizQuestions.length}
                      </span>
                    </div>
                  </div>
                  <div className="quiz-topic">
                    {current.topic} <span>•</span> Câu hỏi trắc nghiệm
                  </div>
                  <h3>{current.question}</h3>
                  <div className="options-grid">
                    {current.options.map((option, index) => (
                      <button
                        key={option}
                        onClick={() => chooseQuizAnswer(index)}
                        className={`option ${answer === index ? (index === current.answer ? "correct" : "wrong") : ""}`}
                      >
                        <span className="option-letter">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span>{option}</span>
                        {answer === index && index === current.answer && (
                          <Check size={16} />
                        )}
                      </button>
                    ))}
                  </div>
                  {answer !== null && (
                    <div className="explanation">
                      <Sparkles size={16} />
                      <span>
                        <b>Giải thích:</b> {current.explanation}
                      </span>
                    </div>
                  )}
                  <div className="quiz-footer">
                    <span>
                      {answer === null
                        ? "Chọn một đáp án để kiểm tra"
                        : answer === current.answer
                          ? "Chính xác! Làm tốt lắm."
                          : "Chưa đúng, hãy xem lại giải thích."}
                    </span>
                    <button
                      className="next-button"
                      onClick={() => {
                        setQuizIndex((value) => value + 1);
                        setAnswer(null);
                      }}
                    >
                      Câu tiếp theo <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
                <section className="activity-panel">
                  <div className="section-heading">
                    <div>
                      <h2>Hoạt động gần đây</h2>
                      <p className="muted">Theo dõi tiến độ của bạn</p>
                    </div>
                    <button className="icon-button">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                  <div
                    className={
                      progress.activities.length
                        ? "activity-list"
                        : "activity-list empty-activity"
                    }
                  >
                    {progress.activities.length ? (
                      progress.activities.map((activity) => (
                        <div
                          className="activity-item"
                          key={`${activity.createdAt}-${activity.topic}`}
                        >
                          <span className="activity-icon green">
                            <Check size={16} />
                          </span>
                          <div>
                            <b>Hoàn thành bài luyện tập</b>
                            <small>
                              {activity.topic} · {activity.score}/
                              {activity.total} câu đúng
                            </small>
                          </div>
                          <time>
                            {new Date(activity.createdAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </time>
                        </div>
                      ))
                    ) : (
                      <p className="muted">
                        Chưa có hoạt động. Hãy bắt đầu một bài luyện tập.
                      </p>
                    )}
                  </div>
                  <button className="full-link">
                    Xem lịch sử hoạt động <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <section className="question-library">
                <div className="section-heading">
                  <div>
                    <h2>Thư viện câu hỏi</h2>
                    <p className="muted">
                      Tìm kiếm và quản lý kho kiến thức của bạn
                    </p>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => setUploadOpen(true)}
                  >
                    <Plus size={16} /> Thêm câu hỏi
                  </button>
                </div>
                <div className="library-toolbar">
                  <div className="search-box">
                    <Search size={17} />
                    <input
                      placeholder="Tìm kiếm câu hỏi..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                  <select
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                  >
                    <option>Tất cả chủ đề</option>
                    {topicCards.map((item) => (
                      <option key={item.name}>{item.name}</option>
                    ))}
                  </select>
                  <button className="filter-button">
                    <Filter size={16} /> Bộ lọc
                  </button>
                </div>
                <div className="question-table">
                  <div className="table-head">
                    <span>CÂU HỎI</span>
                    <span>CHỦ ĐỀ</span>
                    <span>ĐỘ KHÓ</span>
                    <span>TRẠNG THÁI</span>
                  </div>
                  {filtered.slice(0, 4).map((item) => (
                    <div className="table-row" key={item.id}>
                      <div className="question-name">
                        <span className="mini-number">
                          {String(item.id).padStart(2, "0")}
                        </span>
                        <span>{item.question}</span>
                      </div>
                      <span className="topic-pill">{item.topic}</span>
                      <span className="difficulty-dot">Trung bình</span>
                      <span className="status-pill">
                        <span /> Đã học
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
      {uploadOpen && (
        <div className="modal-backdrop" onClick={() => setUploadOpen(false)}>
          <div
            className="upload-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setUploadOpen(false)}
            >
              <X size={19} />
            </button>
            <div className="modal-icon">
              <FileUp size={24} />
            </div>
            <h2>Nhập bộ câu hỏi</h2>
            <p>
              Tải lên DOCX, TXT, CSV hoặc JSON. Hquiz sẽ trích xuất câu hỏi, đáp
              án và phần giải thích.
            </p>
            <div
              className="drop-zone"
              onClick={() => fileInput.current?.click()}
            >
              <input
                ref={fileInput}
                type="file"
                accept=".docx,.txt,.csv,.json"
                hidden
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <Upload size={24} />
              <b>Chọn file để tải lên</b>
              <span>hoặc kéo thả vào đây</span>
              <small>DOCX, TXT, CSV, JSON · tối đa 10MB</small>
            </div>
            {upload.status !== "idle" && (
              <div className={`upload-status ${upload.status}`}>
                {upload.status === "reading"
                  ? "Đang phân tích file..."
                  : upload.text}
              </div>
            )}
            <div className="format-note">
              <b>Mẹo định dạng:</b> mỗi câu cách nhau một dòng trống, đáp án bắt
              đầu bằng A), B), C), D); thêm dòng “Đáp án: B” và “Giải thích:
              ...” nếu có.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
