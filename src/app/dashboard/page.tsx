
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

type Student = {
  id: string;
  name: string;
  email: string;
};

type QuizQuestion = {
  topic: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  source: string;
  evidence: string;
};

const navItems = [
  { name: "Overview", icon: "🏠" },
  { name: "My Materials", icon: "📚" },
  { name: "Diagnostic Quiz", icon: "📝" },
  { name: "Knowledge Gaps", icon: "🎯" },
  { name: "Revision Plan", icon: "📅" },
];

export default function DashboardPage() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [material, setMaterial] = useState("");
  const [materials, setMaterials] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadStudent() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!active) return;

        if (error || !data.user) {
          router.replace("/auth");
          return;
        }

        const user = data.user;
        const metadata = user.user_metadata ?? {};

        setStudent({
          id: user.id,
          name:
            metadata.full_name ||
            metadata.name ||
            user.email?.split("@")[0] ||
            "Student",
          email: user.email ?? "",
        });

        setLoading(false);
      } catch {
        if (active) {
          router.replace("/auth");
        }
      }
    }

    loadStudent();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/auth");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function signOut() {
    setProfileOpen(false);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace("/auth");
    router.refresh();
  }

  function addMaterial() {
    if (!material.trim()) {
      setMessage("Please enter your study material first.");
      return;
    }

    setMaterials((previous) => [...previous, material.trim()]);
    setMaterial("");
    setMessage("Material added for this session.");
  }

  async function generateQuiz() {
    if (materials.length === 0) {
      setMessage("Please add study material first.");
      setActiveTab("My Materials");
      return;
    }

    setQuizLoading(true);
    setQuizError("");
    setMessage("");
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizSubmitted(false);

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          material: materials.join("\n\n"),
          sourceName: "My Study Material",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz.");
      }

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No quiz questions were returned. Please try again.");
      }

      setQuizQuestions(data.questions);
    } catch (error) {
      setQuizError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setQuizLoading(false);
    }
  }

  if (loading || !student) {
    return (
      <main className="loading-screen">
        <p>Loading your dashboard...</p>
      </main>
    );
  }

  const initial = student.name.charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>🌱</span>
          <span>GapFinder AI</span>
        </div>

        <p className="sidebar-label">YOUR WORKSPACE</p>

        <nav className="side-nav">
          {navItems.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`nav-item ${
                activeTab === item.name ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab(item.name);
                setMessage("");
                setProfileOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          Your personal learning space
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <strong>{activeTab}</strong>

          <div className="topbar-right">
            <div className="profile-container">
              <button
                type="button"
                className="profile-button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                <span className="profile-avatar">{initial}</span>
                <span className="profile-name">{student.name}</span>
                <span>⌄</span>
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-header">
                    <div className="profile-avatar">{initial}</div>

                    <div className="profile-details">
                      <strong>{student.name}</strong>
                      <span>{student.email}</span>
                    </div>
                  </div>

                  <div className="profile-divider" />

                  <button
                    type="button"
                    className="profile-menu-item"
                    onClick={() => {
                      setActiveTab("My Profile");
                      setProfileOpen(false);
                      setMessage("");
                    }}
                  >
                    <span>👤</span>
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    className="profile-menu-item signout-button"
                    onClick={signOut}
                  >
                    <span>↪</span>
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="page-content">
          {activeTab === "Overview" && (
            <>
              <section className="welcome-row">
                <div>
                  <h1>Welcome back, {student.name}! 👋</h1>
                  <p>
                    Welcome to your personal learning space.
                    Add study materials, practise questions, and
                    track your learning journey.
                  </p>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setActiveTab("My Materials")}
                  >
                    + Add Study Material
                  </button>
                </div>

                <div className="hero-art">📚</div>
              </section>

              <section className="stats-grid">
                <div className="stat-card">
                  <h3>Study Materials</h3>
                  <div className="stat-value">{materials.length}</div>
                  <p>Added in this session</p>
                </div>

                <div className="stat-card">
                  <h3>Quizzes Completed</h3>
                  <div className="stat-value">
                    {quizSubmitted ? 1 : 0}
                  </div>
                  <p>Quiz tracking for this session</p>
                </div>

                <div className="stat-card">
                  <h3>Learning Progress</h3>
                  <div className="stat-value">
                    {quizSubmitted && quizQuestions.length > 0
                      ? `${Math.round(
                          (quizQuestions.filter(
                            (question, index) =>
                              quizAnswers[index] === question.answer
                          ).length /
                            quizQuestions.length) *
                            100
                        )}%`
                      : "—"}
                  </div>
                  <p>Based on your latest quiz</p>
                </div>
              </section>

              <section className="content-grid">
                <div className="panel">
                  <h2>Continue Learning</h2>
                  <p className="panel-description">
                    Add your notes and start preparing for a quiz.
                  </p>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setActiveTab("My Materials")}
                  >
                    Open My Materials
                  </button>
                </div>

                <div className="panel">
                  <h2>Your Account</h2>
                  <p className="panel-description">
                    You are signed in as:
                  </p>
                  <strong>{student.name}</strong>
                  <p>{student.email}</p>
                </div>
              </section>
            </>
          )}

          {activeTab === "My Materials" && (
            <section className="panel">
              <h2>My Study Materials 📚</h2>
              <p className="panel-description">
                Paste your notes or study material below.
              </p>

              <div className="form-group">
                <label htmlFor="study-material">Study material</label>
                <textarea
                  id="study-material"
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  placeholder="Paste your Python, photosynthesis, or other study notes here..."
                />
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={addMaterial}
              >
                Add Material
              </button>

              {message && (
                <p className="panel-description">{message}</p>
              )}

              {materials.map((item, index) => (
                <article className="answer-option" key={index}>
                  <strong>Study Material {index + 1}</strong>
                  <p>{item}</p>
                </article>
              ))}
            </section>
          )}

          {activeTab === "Diagnostic Quiz" && (
            <section className="panel">
              <h2>Diagnostic Quiz 📝</h2>
              <p className="panel-description">
                Generate five questions based on the study material you added.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={generateQuiz}
                disabled={quizLoading}
              >
                {quizLoading ? "Generating Quiz..." : "Prepare Quiz"}
              </button>

              {message && (
                <p className="panel-description">{message}</p>
              )}

              {quizError && (
                <p className="panel-description">{quizError}</p>
              )}

              {quizQuestions.length > 0 && (
                <section className="quiz-section">
                  <h2>Answer the Questions</h2>

                  {quizQuestions.map((question, index) => (
                    <div className="quiz-question" key={index}>
                      <h3>
                        {index + 1}. {question.question}
                      </h3>

                      {question.options.map((option, optionIndex) => (
                        <label
                          key={optionIndex}
                          className="quiz-option"
                        >
                          <input
                            type="radio"
                            name={`question-${index}`}
                            checked={quizAnswers[index] === optionIndex}
                            disabled={quizSubmitted}
                            onChange={() =>
                              setQuizAnswers((previous) => ({
                                ...previous,
                                [index]: optionIndex,
                              }))
                            }
                          />
                          {option}
                        </label>
                      ))}

                      {quizSubmitted && (
                        <div className="panel-description">
                          <p>
                            <strong>
                              Correct answer:{" "}
                              {question.options[question.answer]}
                            </strong>
                          </p>
                          <p>{question.explanation}</p>
                          <p>Evidence: “{question.evidence}”</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {!quizSubmitted ? (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setQuizSubmitted(true)}
                      disabled={
                        Object.keys(quizAnswers).length !==
                        quizQuestions.length
                      }
                    >
                      Submit Answers
                    </button>
                  ) : (
                    <h3>
                      Your score:{" "}
                      {
                        quizQuestions.filter(
                          (question, index) =>
                            quizAnswers[index] === question.answer
                        ).length
                      }{" "}
                      / {quizQuestions.length}
                    </h3>
                  )}
                </section>
              )}
            </section>
          )}

          {activeTab === "Knowledge Gaps" && (
            <section className="panel">
              <h2>Knowledge Gaps 🎯</h2>
              <p className="panel-description">
                {quizSubmitted && quizQuestions.length > 0
                  ? "Review the incorrect answers and explanations in your completed quiz."
                  : "Your knowledge gaps will appear here after you complete a quiz."}
              </p>

              {quizSubmitted &&
                quizQuestions.map((question, index) =>
                  quizAnswers[index] !== question.answer ? (
                    <article className="answer-option" key={index}>
                      <strong>{question.topic}</strong>
                      <p>{question.question}</p>
                      <p>
                        Your answer:{" "}
                        {question.options[quizAnswers[index]] ?? "Not answered"}
                      </p>
                      <p>
                        Correct answer: {question.options[question.answer]}
                      </p>
                    </article>
                  ) : null
                )}
            </section>
          )}

          {activeTab === "Revision Plan" && (
            <section className="panel">
              <h2>Revision Plan 📅</h2>
              <p className="panel-description">
                Your personalised revision plan will appear here after
                progress tracking is connected.
              </p>
            </section>
          )}

          {activeTab === "My Profile" && (
            <section className="panel">
              <h2>My Profile</h2>

              <div className="profile-header">
                <div className="profile-avatar">{initial}</div>
                <div className="profile-details">
                  <strong>{student.name}</strong>
                  <span>{student.email}</span>
                </div>
              </div>

              <p>
                <strong>Account ID:</strong> {student.id}
              </p>

              <button
                type="button"
                className="secondary-button"
                onClick={signOut}
              >
                Sign out
              </button>
            </section>
          )}

          <footer className="page-footer">
            <span>GapFinder AI</span>
            <span>Your personal learning journey</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
