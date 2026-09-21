import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
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

  const [codeInput, setCodeInput] = useState("");

  const [codeOutput, setCodeOutput] = useState("");

  const [runningCode, setRunningCode] = useState(false);

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

  const getCodingAnswer = (question) => {
    const saved = answers[question.id];

    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      return saved;
    }

    const languages =
      Array.isArray(question.allowed_languages) &&
      question.allowed_languages.length > 0
        ? question.allowed_languages
        : ["python", "javascript", "java", "cpp"];

    return {
      language: languages[0],
      codes: {},
    };
  };

  const getStarterCode = (question, language) => {
    if (question?.starter_code && typeof question.starter_code === "object") {
      const savedStarter = question.starter_code[language];

      if (savedStarter) {
        return savedStarter;
      }
    }

    switch (language) {
      case "javascript":
        return `function solution(input) {
  // Write your code here
  return input;
}

const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();

console.log(solution(input));
`;

      case "java":
        return `import java.io.*;
import java.util.*;

public class Main {

    public static String solution(String input) {
        // Write your code here
        return input;
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(
            new InputStreamReader(System.in)
        );

        StringBuilder input = new StringBuilder();
        String line;

        while ((line = br.readLine()) != null) {
            if (input.length() > 0) {
                input.append("\\n");
            }

            input.append(line);
        }

        System.out.println(
            solution(input.toString())
        );
    }
}
`;

      case "cpp":
        return `#include <iostream>
#include <string>
#include <sstream>
using namespace std;

string solution(const string& input) {
    // Write your code here
    return input;
}

int main() {
    ostringstream buffer;
    buffer << cin.rdbuf();

    string input = buffer.str();

    if (!input.empty() && input.back() == '\\n') {
        input.pop_back();
    }

    cout << solution(input);

    return 0;
}
`;

      case "sql":
        return `-- SQL runner sẽ được xử lý riêng
-- Write your SQL query here

`;

      case "python":
      default:
        return `def solution(input_data):
    # Write your code here
    return input_data


if __name__ == "__main__":
    import sys

    input_data = sys.stdin.read().strip()

    print(solution(input_data))
`;
    }
  };

  const getEditorLanguage = (language) => {
    if (language === "cpp") return "cpp";
    if (language === "javascript") return "javascript";
    if (language === "java") return "java";
    if (language === "sql") return "sql";
    return "python";
  };

  const changeCodingLanguage = (question, language) => {
    setAnswers((prev) => {
      const old =
        prev[question.id] && typeof prev[question.id] === "object"
          ? prev[question.id]
          : {
              language,
              codes: {},
            };

      return {
        ...prev,
        [question.id]: {
          ...old,
          language,
          codes: old.codes || {},
        },
      };
    });
  };

  const changeCodingCode = (question, language, code) => {
    setAnswers((prev) => {
      const old =
        prev[question.id] && typeof prev[question.id] === "object"
          ? prev[question.id]
          : {
              language,
              codes: {},
            };

      return {
        ...prev,
        [question.id]: {
          ...old,
          language,
          codes: {
            ...(old.codes || {}),
            [language]: code || "",
          },
        },
      };
    });
  };

  const resetCodingCode = (question, language) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: {
        language,
        codes: {
          ...(prev[question.id]?.codes || {}),
          [language]: getStarterCode(question, language),
        },
      },
    }));
  };

  async function runCurrentCode(question, language, code) {
    if (!code.trim()) {
      setCodeOutput("Bạn chưa nhập code.");
      return;
    }

    if (language === "sql") {
      setCodeOutput("SQL sẽ được nối bộ thực thi riêng ở bước tiếp theo.");
      return;
    }

    setRunningCode(true);
    setCodeOutput("Đang chạy...");

    try {
      const response = await fetch(`${API_URL}/api/code/run`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          language,
          sourceCode: code,
          stdin: codeInput,
        }),
      });

      const raw = await response.text();

      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        console.error("API returned non-JSON:", raw);

        throw new Error(
          `API /api/code/run không trả JSON. HTTP ${response.status}.`,
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Không chạy được code");
      }

      let output = "";

      output += `Status: ${data.status?.description || "Unknown"}\n`;

      if (data.time) {
        output += `Time: ${data.time}s\n`;
      }

      if (data.memory) {
        output += `Memory: ${data.memory} KB\n`;
      }

      if (data.stdout) {
        output += `\nOutput:\n${data.stdout}`;
      }

      if (data.compileOutput) {
        output += `\nCompile error:\n${data.compileOutput}`;
      }

      if (data.stderr) {
        output += `\nRuntime error:\n${data.stderr}`;
      }

      if (data.message) {
        output += `\n${data.message}`;
      }

      setCodeOutput(output);
    } catch (err) {
      setCodeOutput(`Lỗi: ${err.message}`);
    } finally {
      setRunningCode(false);
    }
  }

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

      setCodeInput("");

      setCodeOutput("");

      setRunningCode(false);

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

  const isQuestionAnswered = (question) => {
    const answer = answers[String(question.id)];

    if (answer === null || answer === undefined) {
      return false;
    }

    if (test?.type === "coding") {
      if (typeof answer !== "object" || Array.isArray(answer)) {
        return false;
      }

      return Object.values(answer.codes || {}).some(
        (code) => typeof code === "string" && code.trim().length > 0,
      );
    }

    if (typeof answer === "string") {
      return answer.trim().length > 0;
    }

    return true;
  };

  const answeredCount = questions.filter(isQuestionAnswered).length;

  return (
    <div className="english-page english-exam">
      <header className="english-exam-top">
        <div>
          <p className="eyebrow">
            {test?.type === "coding" ? "CODING TEST" : "ENGLISH TEST"}
          </p>

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
              isQuestionAnswered(question) ? "answered" : "",
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
        <section
          className={`english-question-card ${
            test?.type === "coding" ? "coding-question-card" : ""
          }`}
        >
          <p className="eyebrow">CÂU {currentIndex + 1}</p>

          {test.type === "coding" ? (
            (() => {
              const codingAnswer = getCodingAnswer(current);

              const languages =
                Array.isArray(current.allowed_languages) &&
                current.allowed_languages.length > 0
                  ? current.allowed_languages
                  : ["python", "javascript", "java", "cpp"];

              const language = codingAnswer.language || languages[0];

              const code =
                codingAnswer.codes?.[language] ??
                getStarterCode(current, language);

              const metadata =
                current.metadata &&
                typeof current.metadata === "object" &&
                !Array.isArray(current.metadata)
                  ? current.metadata
                  : {};

              const example = metadata.example || "";
              const complexity = metadata.knowledge_complexity || "";
              const difficulty =
                metadata.difficulty_original || current.difficulty || "";

              return (
                <div className="coding-workspace">
                  <div className="coding-problem-panel">
                    <div className="coding-problem-heading">
                      <div>
                        <span className="coding-section-label">Đề bài</span>
                        <h2>{current.prompt}</h2>
                      </div>

                      {difficulty && (
                        <span className="coding-difficulty">{difficulty}</span>
                      )}
                    </div>

                    {example && (
                      <div className="coding-example">
                        <strong>Ví dụ</strong>
                        <pre>{example}</pre>
                      </div>
                    )}

                    {complexity && (
                      <div className="coding-complexity">
                        <strong>Kiến thức / độ phức tạp</strong>
                        <p>{complexity}</p>
                      </div>
                    )}

                    <div className="coding-help">
                      Code của bạn được lưu khi gõ và vẫn còn khi chuyển qua câu
                      khác.
                    </div>
                  </div>

                  <div className="coding-editor-panel">
                    <div className="coding-editor-toolbar">
                      <div>
                        <span className="coding-section-label">
                          Trình soạn thảo
                        </span>
                        <strong>Code Editor</strong>
                      </div>

                      <select
                        className="coding-language-select"
                        value={language}
                        onChange={(event) => {
                          changeCodingLanguage(current, event.target.value);
                          setCodeOutput("");
                        }}
                      >
                        {languages.map((item) => (
                          <option key={item} value={item}>
                            {item === "python"
                              ? "Python"
                              : item === "javascript"
                                ? "JavaScript"
                                : item === "java"
                                  ? "Java"
                                  : item === "cpp"
                                    ? "C++"
                                    : item === "sql"
                                      ? "SQL"
                                      : item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="coding-editor-shell">
                      <Editor
                        height="440px"
                        language={getEditorLanguage(language)}
                        value={code}
                        theme="vs-dark"
                        onChange={(value) =>
                          changeCodingCode(current, language, value || "")
                        }
                        options={{
                          fontSize: 15,
                          lineHeight: 23,
                          minimap: { enabled: false },
                          automaticLayout: true,
                          scrollBeyondLastLine: false,
                          wordWrap: "on",
                          tabSize: 4,
                          padding: { top: 16, bottom: 16 },
                        }}
                      />
                    </div>

                    <div className="coding-editor-actions">
                      <button
                        type="button"
                        className="coding-reset-button"
                        onClick={() => {
                          resetCodingCode(current, language);
                          setCodeOutput("");
                        }}
                      >
                        Đặt lại code
                      </button>

                      <button
                        type="button"
                        className="coding-run-button"
                        disabled={runningCode}
                        onClick={() => runCurrentCode(current, language, code)}
                      >
                        {runningCode ? "Đang chạy..." : "▶ Run Code"}
                      </button>
                    </div>

                    <div className="coding-stdin">
                      <label htmlFor={`stdin-${current.id}`}>
                        Input (stdin)
                      </label>

                      <textarea
                        id={`stdin-${current.id}`}
                        value={codeInput}
                        onChange={(event) => setCodeInput(event.target.value)}
                        placeholder="Nhập dữ liệu đầu vào cho chương trình..."
                        spellCheck="false"
                      />
                    </div>

                    <div className="coding-console">
                      <div className="coding-console-title">Kết quả chạy</div>

                      <pre className="coding-console-output">
                        {codeOutput || "Nhấn Run Code để xem kết quả."}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              <h2>{current.prompt}</h2>

              {test.type === "english_writing" ? (
                <div className="english-writing-box">
                  <textarea
                    className="english-writing-textarea"
                    value={answers[current.id] || ""}
                    onChange={(e) => {
                      setAnswers((prev) => ({
                        ...prev,
                        [current.id]: e.target.value,
                      }));
                    }}
                    placeholder="Write your answer here..."
                    spellCheck="true"
                  />

                  <div className="english-writing-info">
                    <span>
                      {
                        (answers[current.id] || "")
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean).length
                      }{" "}
                      words
                    </span>

                    <span>
                      Your answer is saved while you move between questions.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="english-options">
                  {current.options?.map((option, optionIndex) => {
                    const letter = String.fromCharCode(65 + optionIndex);
                    const selected = answers[current.id] === letter;

                    return (
                      <button
                        type="button"
                        key={letter}
                        className={`english-option ${
                          selected ? "selected" : ""
                        }`}
                        onClick={() => chooseAnswer(current.id, letter)}
                      >
                        <span className="english-option-letter">{letter}</span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
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
