import { useEffect, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Languages,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);

  const minutes = Math.floor(safeSeconds / 60);

  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0",
  )}:${String(seconds).padStart(2, "0")}`;
}

export default function EnglishModule({ onBack }) {
  const [mode, setMode] = useState("list");

  const [tests, setTests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [test, setTest] = useState(null);

  const [questions, setQuestions] = useState([]);

  const [attemptId, setAttemptId] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState({});

  const [timeLeft, setTimeLeft] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState(null);

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    if (mode !== "test" || timeLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mode, timeLeft]);

  useEffect(() => {
    if (mode === "test" && timeLeft === 0 && attemptId && !submitting) {
      submitExam(true);
    }
  }, [mode, timeLeft, attemptId, submitting]);

  async function loadTests() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/english-tests`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không tải được English Test");
      }

      setTests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function startTest(testId) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/tests/${testId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể bắt đầu bài thi");
      }

      setTest(data.test);

      setQuestions(data.questions || []);

      setAttemptId(data.attemptId);

      setAnswers({});

      setCurrentIndex(0);

      setResult(null);

      setTimeLeft(Number(data.test.time_limit_minutes || 30) * 60);

      setMode("test");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function chooseAnswer(questionId, letter) {
    setAnswers((previous) => ({
      ...previous,
      [String(questionId)]: letter,
    }));
  }

  async function submitExam(automatic = false) {
    if (submitting || !test || !attemptId) {
      return;
    }

    if (!automatic) {
      const unanswered = questions.filter(
        (question) => !answers[String(question.id)],
      ).length;

      if (unanswered > 0) {
        const confirmed = window.confirm(
          `Bạn còn ${unanswered} câu chưa trả lời. Vẫn nộp bài?`,
        );

        if (!confirmed) {
          return;
        }
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/tests/${test.id}/submit-mcq`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            attemptId,
            answers,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể nộp bài");
      }

      setResult(data);

      setMode("result");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="english-page">
        <div className="english-loading">Đang tải English Test...</div>
      </div>
    );
  }

  if (mode === "list") {
    return (
      <div className="english-page">
        <div className="english-header">
          <button className="english-back" onClick={onBack}>
            <ArrowLeft size={17} />
            Tổng quan
          </button>

          <div>
            <p className="eyebrow">FPT SOFTWARE INTERN</p>

            <h1>English Test</h1>

            <p className="muted">
              Grammar, Vocabulary, Reading và Technical English
            </p>
          </div>
        </div>

        {error && <div className="english-error">{error}</div>}

        {!tests.length ? (
          <div className="english-empty">
            <BookOpen size={32} />

            <h3>Chưa có bài English Test</h3>

            <p>Hãy tạo bài thi trong Supabase trước.</p>
          </div>
        ) : (
          <div className="english-test-grid">
            {tests.map((item) => (
              <article className="english-test-card" key={item.id}>
                <div className="english-test-icon">
                  <Languages size={24} />
                </div>

                <span className="english-topic">
                  {item.topic_title || "English"}
                </span>

                <h3>{item.title}</h3>

                <p>{item.description || "English practice test"}</p>

                <div className="english-test-meta">
                  <span>
                    <Clock3 size={15} />
                    {item.time_limit_minutes} phút
                  </span>

                  <span>
                    <BookOpen size={15} />
                    {item.question_count} câu
                  </span>
                </div>

                <button
                  className="primary-button"
                  onClick={() => startTest(item.id)}
                >
                  Bắt đầu
                  <ArrowRight size={16} />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mode === "result") {
    return (
      <div className="english-page">
        <div className="english-result">
          <CheckCircle2 size={48} />

          <p className="eyebrow">HOÀN THÀNH BÀI THI</p>

          <h1>{test?.title}</h1>

          <div className="english-score">
            {result?.score}

            <span>/100</span>
          </div>

          <p>
            Đúng <strong>{result?.correct}</strong> / {result?.total} câu
          </p>

          <div className="result-actions">
            <button
              className="secondary-button"
              onClick={() => {
                setMode("list");
                loadTests();
              }}
            >
              Danh sách đề
            </button>

            <button
              className="primary-button"
              onClick={() => startTest(test.id)}
            >
              Làm lại
            </button>
          </div>
        </div>

        <div className="english-review">
          <h2>Xem lại đáp án</h2>

          {result?.details?.map((item, index) => (
            <div
              className={`english-review-item ${
                item.correct ? "correct" : "wrong"
              }`}
              key={item.questionId}
            >
              <strong>
                Câu {index + 1}. {item.prompt}
              </strong>

              <p>
                Bạn chọn: <b>{item.selected || "Chưa trả lời"}</b>
              </p>

              <p>
                Đáp án đúng: <b>{item.correctAnswer}</b>
              </p>

              {item.explanation && (
                <p>
                  <b>Giải thích:</b> {item.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="english-page english-exam">
      <header className="english-exam-top">
        <div>
          <p className="eyebrow">ENGLISH TEST</p>

          <h2>{test?.title}</h2>
        </div>

        <div className={`english-timer ${timeLeft <= 300 ? "warning" : ""}`}>
          <Clock3 size={18} />

          {formatTime(timeLeft)}
        </div>
      </header>

      {error && <div className="english-error">{error}</div>}

      <div className="english-progress-row">
        <span>
          Đã trả lời {answeredCount}/{questions.length}
        </span>

        <span>
          Câu {currentIndex + 1}/{questions.length}
        </span>
      </div>

      <div className="english-question-nav">
        {questions.map((question, index) => (
          <button
            key={question.id}
            className={[
              index === currentIndex ? "current" : "",
              answers[String(question.id)] ? "answered" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setCurrentIndex(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {current && (
        <section className="english-question-card">
          <p className="eyebrow">CÂU {currentIndex + 1}</p>

          <h2>{current.prompt}</h2>

          <div className="english-options">
            {(current.options || []).map((option, optionIndex) => {
              const letter = String.fromCharCode(65 + optionIndex);

              const selected = answers[String(current.id)] === letter;

              return (
                <button
                  key={letter}
                  className={
                    selected ? "english-option selected" : "english-option"
                  }
                  onClick={() => chooseAnswer(current.id, letter)}
                >
                  <span>{letter}</span>

                  <b>{option}</b>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <footer className="english-exam-footer">
        <button
          className="secondary-button"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
        >
          Câu trước
        </button>

        <div>
          {currentIndex < questions.length - 1 ? (
            <button
              className="primary-button"
              onClick={() => setCurrentIndex((value) => value + 1)}
            >
              Câu tiếp theo
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={submitting}
              onClick={() => submitExam(false)}
            >
              {submitting ? "Đang chấm..." : "Nộp bài"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
