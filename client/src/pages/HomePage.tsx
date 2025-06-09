import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ErrorMessage from "../components/common/ErrorMessage";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import TopNavigation from "../components/common/TopNavigation";

// Demo Tabs Component
const DemoTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"owner" | "staff">("owner");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Sample questions for the staff demo
  const sampleQuestions = [
    {
      category: "Food Allergies",
      question:
        "What allergen should you warn customers about in our Caesar Salad?",
      options: ["Nuts", "Raw Eggs", "Gluten", "Dairy"],
      correctAnswer: 1,
      explanation:
        "Correct! Traditional Caesar dressing contains raw eggs, which can be dangerous for pregnant women and immunocompromised individuals.",
    },
    {
      category: "Beverage Knowledge",
      question:
        "What type of glass should be used for serving our Old Fashioned cocktail?",
      options: ["Highball Glass", "Rocks Glass", "Martini Glass", "Wine Glass"],
      correctAnswer: 1,
      explanation:
        "Excellent! An Old Fashioned is traditionally served in a rocks glass (also called an old fashioned glass) over ice.",
    },
    {
      category: "Menu Knowledge",
      question:
        "Which ingredient makes our Truffle Risotto vegetarian-friendly?",
      options: ["Chicken Stock", "Vegetable Stock", "Beef Stock", "Fish Stock"],
      correctAnswer: 1,
      explanation:
        "Right! We use vegetable stock instead of meat-based stocks, making this dish suitable for vegetarians.",
    },
    {
      category: "Procedure Knowledge",
      question: "What's the proper temperature for serving our house red wine?",
      options: [
        "Ice Cold (4-6°C)",
        "Chilled (8-12°C)",
        "Room Temperature (18-20°C)",
        "Warm (25°C)",
      ],
      correctAnswer: 2,
      explanation:
        "Perfect! Red wines are best served at room temperature (18-20°C) to bring out their full flavor profile.",
    },
    {
      category: "Food Safety",
      question:
        "How long can cooked seafood be safely held at room temperature?",
      options: ["30 minutes", "1 hour", "2 hours", "4 hours"],
      correctAnswer: 2,
      explanation:
        "Correct! The 2-hour rule applies to all perishable foods - they shouldn't be left at room temperature for more than 2 hours.",
    },
    {
      category: "Cocktail Knowledge",
      question:
        "What's the base spirit in our signature 'Garden Gimlet' cocktail?",
      options: ["Vodka", "Gin", "Rum", "Whiskey"],
      correctAnswer: 1,
      explanation:
        "Right! Our Garden Gimlet is gin-based, featuring our house gin with fresh cucumber and lime.",
    },
    {
      category: "Dietary Requirements",
      question: "Which of our desserts is naturally gluten-free?",
      options: [
        "Chocolate Lava Cake",
        "Panna Cotta",
        "Apple Crumble",
        "Tiramisu",
      ],
      correctAnswer: 1,
      explanation:
        "Excellent! Our Panna Cotta is made with cream, sugar, and gelatin - naturally gluten-free ingredients.",
    },
  ];

  const currentQuestion = sampleQuestions[currentQuestionIndex];
  const totalQuestions = sampleQuestions.length;

  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex((prev) =>
      prev > 0 ? prev - 1 : totalQuestions - 1
    );
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((prev) =>
      prev < totalQuestions - 1 ? prev + 1 : 0
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex justify-center mb-12">
        <div className="bg-white rounded-2xl p-2 shadow-lg border border-slate-200">
          <button
            onClick={() => setActiveTab("owner")}
            className={`px-8 py-4 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === "owner"
                ? "bg-gradient-to-r from-primary to-primary-600 text-white shadow-md"
                : "text-muted-gray hover:text-dark-slate hover:bg-slate-50"
            }`}
          >
            Restaurant Owner
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-8 py-4 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === "staff"
                ? "bg-gradient-to-r from-primary to-primary-600 text-white shadow-md"
                : "text-muted-gray hover:text-dark-slate hover:bg-slate-50"
            }`}
          >
            Staff Member
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "owner" && (
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Owner Workflow */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
                <h3 className="text-xl font-semibold text-dark-slate">
                  Upload Your Menu
                </h3>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-200">
                <div className="border-2 border-dashed border-primary-300 rounded-lg p-8 text-center bg-primary-50">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-6 h-6 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <p className="text-primary-700 font-medium">
                    Drop your menu PDF here
                  </p>
                  <p className="text-sm text-primary-600 mt-2">
                    AI will analyze your content
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-accent to-accent-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <h3 className="text-xl font-semibold text-dark-slate">
                  AI Generates Quizzes
                </h3>
              </div>
              <div className="bg-gradient-to-br from-accent-50 to-white rounded-xl p-6 border border-accent-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span className="text-sm text-accent-700">
                    Processing menu content...
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 border border-accent-200">
                    <p className="text-sm text-dark-slate">
                      ✓ Created 24 food knowledge questions
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-accent-200">
                    <p className="text-sm text-dark-slate">
                      ✓ Generated 18 allergen awareness quizzes
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-accent-200">
                    <p className="text-sm text-dark-slate">
                      ✓ Built 12 wine pairing questions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Owner Dashboard */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-secondary to-secondary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <h3 className="text-xl font-semibold text-dark-slate">
                Track Team Progress
              </h3>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-4 border border-primary-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-primary-700">
                    Sarah (Server)
                  </span>
                  <span className="text-sm text-primary-600">92% Complete</span>
                </div>
                <div className="w-full bg-primary-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: "92%" }}
                  ></div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-accent-50 to-accent-100 rounded-xl p-4 border border-accent-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-accent-700">
                    Mike (Bartender)
                  </span>
                  <span className="text-sm text-accent-600">78% Complete</span>
                </div>
                <div className="w-full bg-accent-200 rounded-full h-2">
                  <div
                    className="bg-accent-600 h-2 rounded-full"
                    style={{ width: "78%" }}
                  ></div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-secondary-50 to-secondary-100 rounded-xl p-4 border border-secondary-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-secondary-700">
                    James (Chef)
                  </span>
                  <span className="text-sm text-secondary-600">
                    65% Complete
                  </span>
                </div>
                <div className="w-full bg-secondary-200 rounded-full h-2">
                  <div
                    className="bg-secondary-600 h-2 rounded-full"
                    style={{ width: "65%" }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-muted-gray font-medium">
                  Training Efficiency
                </span>
                <span className="font-bold text-primary-700 text-lg">
                  +340%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "staff" && (
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Staff Quiz Interface */}
          <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-lg border border-slate-200">
            <div className="mb-8">
              <div className="inline-block bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                AI Generated Quiz
              </div>
              <h3 className="text-2xl font-medium text-dark-slate mb-2">
                {currentQuestion.category}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-muted-gray">
                <span>
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                    style={{
                      width: `${
                        ((currentQuestionIndex + 1) / totalQuestions) * 100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 mb-6 border border-slate-200">
              <p className="text-lg text-dark-slate mb-8 font-medium">
                "{currentQuestion.question}"
              </p>

              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    className={`w-full text-left p-4 rounded-xl transition-colors duration-200 ${
                      index === currentQuestion.correctAnswer
                        ? "bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-300"
                        : "bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <span
                      className={
                        index === currentQuestion.correctAnswer
                          ? "text-primary-700 font-medium"
                          : ""
                      }
                    >
                      {String.fromCharCode(65 + index)}) {option}
                      {index === currentQuestion.correctAnswer && " ✓"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200">
                <p className="text-primary-700 font-medium">
                  ✓ {currentQuestion.explanation}
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={handlePreviousQuestion}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition-colors duration-200"
              >
                Previous
              </button>
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all duration-200"
              >
                Next Question
              </button>
            </div>
          </div>

          {/* Staff Progress & Results */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
              <h3 className="text-xl font-semibold text-dark-slate mb-6">
                Your Progress
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-gray">Overall Knowledge</span>
                  <span className="font-bold text-primary-700">87%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-primary to-primary-600 h-3 rounded-full"
                    style={{ width: "87%" }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-4 border border-primary-200 text-center">
                  <div className="text-2xl font-bold text-primary-700 mb-1">
                    24
                  </div>
                  <div className="text-sm text-primary-600">
                    Quizzes Completed
                  </div>
                </div>
                <div className="bg-gradient-to-r from-accent-50 to-accent-100 rounded-xl p-4 border border-accent-200 text-center">
                  <div className="text-2xl font-bold text-accent-700 mb-1">
                    92%
                  </div>
                  <div className="text-sm text-accent-600">Average Score</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-dark-slate to-slate-800 rounded-2xl p-8 text-white shadow-lg">
              <h4 className="text-xl font-medium mb-4 text-white">
                Knowledge Areas
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Wine Knowledge</span>
                  <span className="text-white font-medium">95%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Food Allergies</span>
                  <span className="text-white font-medium">88%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Menu Specials</span>
                  <span className="text-white font-medium">79%</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-sm text-slate-400">
                    Ready for customer-facing duties
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HomePage: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  // Scroll progress tracker
  useEffect(() => {
    const updateScrollProgress = () => {
      const currentProgress = window.pageYOffset;
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      if (scrollHeight) {
        setScrollProgress(
          Number((currentProgress / scrollHeight).toFixed(2)) * 100
        );
      }
    };

    window.addEventListener("scroll", updateScrollProgress);
    return () => window.removeEventListener("scroll", updateScrollProgress);
  }, []);

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Top Navigation */}
      <TopNavigation variant="transparent" />

      {/* Minimal Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-0.5 bg-slate-100 z-40">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Hero Section - Apple Style with Color */}
      <div className="relative pt-48 pb-32 md:pt-64 md:pb-48 flex items-center justify-center bg-gradient-to-br from-background to-slate-50">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-light text-dark-slate mb-6 tracking-tight leading-none">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                Bite Sized Quizzes.
              </span>
              <br />
              <span className="font-medium">Big Results.</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-gray mb-16 max-w-2xl mx-auto font-light leading-relaxed">
              AI-powered quizzes that turn your menu into engaging training.
              Reduce training costs and improve staff confidence in days, not
              weeks.
            </p>

            <div className="space-y-4">
              <Link
                to="/signup"
                className="inline-block bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-12 py-4 rounded-full text-lg font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
              <p className="text-sm text-muted-gray">No commitment required</p>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Section - With Accent Colors */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-light text-dark-slate mb-6 tracking-tight">
              Training staff shouldn't be
              <span className="text-secondary font-medium"> expensive</span>.
            </h2>
            <p className="text-xl text-muted-gray max-w-3xl mx-auto font-light">
              UK restaurants spend an average of £1,530 training each new
              employee. Most take months to reach full productivity, costing
              thousands in lost output and inefficiency.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 mb-20">
            <div className="text-center p-8 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl border border-primary-200">
              <div className="text-4xl font-light text-primary-600 mb-4">
                £1,530
              </div>
              <h3 className="text-xl font-medium text-dark-slate mb-3">
                Training Cost
              </h3>
              <p className="text-muted-gray leading-relaxed">
                Average cost to train each new restaurant staff member in the UK
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-accent-50 to-accent-100 rounded-2xl border border-accent-200">
              <div className="text-4xl font-light text-accent-600 mb-4">
                6+ months
              </div>
              <h3 className="text-xl font-medium text-dark-slate mb-3">
                Time to Productivity
              </h3>
              <p className="text-muted-gray leading-relaxed">
                How long it takes new employees to reach optimum productivity
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-2xl border border-secondary-200">
              <div className="text-4xl font-light text-secondary-600 mb-4">
                £15,000+
              </div>
              <h3 className="text-xl font-medium text-dark-slate mb-3">
                Lost Productivity
              </h3>
              <p className="text-muted-gray leading-relaxed">
                Estimated cost of inefficiency during the extended training
                period
              </p>
            </div>
          </div>

          <div className="text-center bg-gradient-to-r from-slate-50 to-white rounded-2xl p-12 shadow-sm border border-slate-100">
            <p className="text-2xl md:text-3xl font-light text-dark-slate mb-6">
              What if you could
              <span className="text-primary font-medium">
                {" "}
                dramatically accelerate
              </span>{" "}
              this process?
            </p>
            <Link
              to="/how"
              className="inline-block bg-gradient-to-r from-dark-slate to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white px-10 py-3 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Learn How
            </Link>
          </div>
        </div>
      </section>

      {/* Demo Section - Clean with Colors */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-background">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-light text-dark-slate mb-6 tracking-tight">
              See it in
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent font-medium">
                {" "}
                action
              </span>
              .
            </h2>
            <p className="text-xl text-muted-gray max-w-2xl mx-auto font-light">
              Experience how QuizCrunch works from both perspectives -
              restaurant management and staff training.
            </p>
          </div>

          <DemoTabs />
        </div>
      </section>

      {/* Features - Minimal with Brand Colors */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-light text-dark-slate mb-6 tracking-tight">
              Everything you
              <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent font-medium">
                {" "}
                need
              </span>
              .
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-dark-slate mb-4">
                AI Quiz Generation
              </h3>
              <p className="text-muted-gray leading-relaxed">
                Automatically creates human-like questions from your menu
                content. No manual setup required.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-dark-slate mb-4">
                Progress Tracking
              </h3>
              <p className="text-muted-gray leading-relaxed">
                See exactly which staff know what. Identify knowledge gaps and
                track improvement over time.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-dark-slate mb-4">
                Simple Integration
              </h3>
              <p className="text-muted-gray leading-relaxed">
                Upload your documents and deploy immediately. Works on any
                device, fits any workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Clean with Gradient */}
      <section className="py-24 bg-gradient-to-br from-background via-slate-50 to-primary-50">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-light text-dark-slate mb-6 tracking-tight">
              Ready to get
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                {" "}
                started
              </span>
              ?
            </h2>
            <p className="text-xl text-muted-gray mb-12 font-light leading-relaxed">
              Join restaurants across the UK that have transformed their staff
              training with QuizCrunch.
            </p>

            <div className="space-y-4">
              <Link
                to="/signup"
                className="inline-block bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-12 py-4 rounded-full text-lg font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
              <p className="text-sm text-muted-gray">
                Setup takes less than 5 minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Minimal with Brand Touch */}
      <footer className="bg-gradient-to-r from-dark-slate to-slate-800 text-slate-400 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h3 className="text-2xl font-light text-white mb-8">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                QuizCrunch
              </span>
            </h3>

            <div className="flex flex-wrap justify-center gap-8 mb-12 text-sm">
              <Link
                to="/privacy"
                className="hover:text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="hover:text-primary transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/contact"
                className="hover:text-primary transition-colors"
              >
                Contact
              </Link>
              <Link
                to="/support"
                className="hover:text-primary transition-colors"
              >
                Support
              </Link>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-8 text-center">
            <p className="text-slate-500 text-sm">
              © 2024 QuizCrunch. Made for the hospitality industry.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
