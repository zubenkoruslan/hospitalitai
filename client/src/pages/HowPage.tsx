import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/common/Card";
import TopNavigation from "../components/common/TopNavigation";
import {
  ClockIcon,
  AcademicCapIcon,
  ChartBarIcon,
  SparklesIcon,
  CheckCircleIcon,
  BookOpenIcon,
  UsersIcon,
  CogIcon,
  XMarkIcon,
  DocumentTextIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

const HowPage: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<{
    [key: string]: "before" | "after";
  }>({
    ai: "before",
    coverage: "before",
    analytics: "before",
  });

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
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100 text-text">
      {/* Top Navigation */}
      <TopNavigation variant="transparent" />

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-0.5 bg-slate-100 z-40">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Hero Section */}
      <div className="relative pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <div className="inline-block bg-gradient-to-r from-primary/10 to-accent/10 rounded-full px-6 py-2 mb-8 border border-primary/20">
            <span className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              The Science Behind Accelerated Learning
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-light text-dark-slate mb-8 tracking-tight leading-tight">
            How We
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
              {" "}
              Revolutionize
            </span>
            <br />
            Staff Training
          </h1>

          <p className="text-xl md:text-2xl text-muted-gray mb-12 max-w-3xl mx-auto font-light leading-relaxed">
            Discover the proven methodology that dramatically reduces training
            time while improving knowledge retention and staff confidence
            through AI-powered, bite-sized learning.
          </p>
        </div>
      </div>

      {/* The Problem Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-dark-slate mb-6">
              The Traditional Training
              <span className="text-secondary font-medium"> Challenge</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card
              variant="outlined"
              className="text-center p-8 border-secondary/20"
            >
              <ClockIcon className="h-12 w-12 text-secondary mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-dark-slate mb-4">
                Time Intensive
              </h3>
              <p className="text-muted-gray leading-relaxed">
                Months of inconsistent training with scattered materials and no
                clear progress tracking.
              </p>
            </Card>

            <Card
              variant="outlined"
              className="text-center p-8 border-secondary/20"
            >
              <BookOpenIcon className="h-12 w-12 text-secondary mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-dark-slate mb-4">
                Information Overload
              </h3>
              <p className="text-muted-gray leading-relaxed">
                Staff overwhelmed with manuals, procedures, and menu details
                without structured learning.
              </p>
            </Card>

            <Card
              variant="outlined"
              className="text-center p-8 border-secondary/20"
            >
              <ChartBarIcon className="h-12 w-12 text-secondary mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-dark-slate mb-4">
                No Measurement
              </h3>
              <p className="text-muted-gray leading-relaxed">
                No way to track progress, identify knowledge gaps, or ensure
                consistent standards.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* QuizCrunch Advantages Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-dark-slate mb-6">
              Why Choose
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                {" "}
                QuizCrunch
              </span>
            </h2>
            <p className="text-xl text-muted-gray max-w-3xl mx-auto">
              Experience the game-changing advantages that make QuizCrunch the
              smart choice for efficient restaurant training.
            </p>
          </div>

          {/* Advantages Breakdown */}
          <div className="space-y-12">
            {/* AI-Powered Intelligence */}
            <Card
              variant="elevated"
              className="p-8 md:p-12 bg-gradient-to-br from-primary to-primary-600 border-primary/20 relative overflow-hidden"
            >
              <div className="flex items-start gap-6 relative z-10">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg transition-all duration-500">
                    {activeTab.ai === "after" ? (
                      <SparklesIcon className="h-8 w-8 text-white" />
                    ) : (
                      <DocumentTextIcon className="h-8 w-8 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  {/* Tab Navigation */}
                  <div className="flex space-x-2 mb-6">
                    <button
                      onClick={() =>
                        setActiveTab((prev) => ({ ...prev, ai: "before" }))
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeTab.ai === "before"
                          ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                          : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90"
                      }`}
                    >
                      Before
                    </button>
                    <button
                      onClick={() =>
                        setActiveTab((prev) => ({ ...prev, ai: "after" }))
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeTab.ai === "after"
                          ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                          : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90"
                      }`}
                    >
                      After
                    </button>
                  </div>

                  {/* Content Container */}
                  <div className="relative min-h-[220px]">
                    {/* Traditional Training Content */}
                    <div
                      className={`transition-all duration-500 ${
                        activeTab.ai === "after"
                          ? "opacity-0 translate-y-4 absolute inset-0"
                          : "opacity-100 translate-y-0"
                      }`}
                    >
                      <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-sm">
                        Manual Content Creation
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6 text-white">
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            Time-Consuming Process
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Hours spent manually creating training materials
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Same generic questions for every employee
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Static difficulty that doesn't adapt
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            One-Size-Fits-All Approach
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                No personalization for different learning styles
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Knowledge gaps remain unidentified
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Slow, inefficient learning progression
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* QuizCrunch Content */}
                    <div
                      className={`transition-all duration-500 ${
                        activeTab.ai === "after"
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 -translate-y-4 absolute inset-0"
                      }`}
                    >
                      <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-sm">
                        AI-Powered Intelligence
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6 text-white">
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            Smart Content Generation
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                AI automatically creates relevant questions from
                                your menu
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Generates endless variations to prevent
                                memorization
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Adapts difficulty based on individual
                                performance
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            Personalized Learning Paths
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Each staff member gets a unique training
                                experience
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Focuses on individual knowledge gaps
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Optimizes learning speed for faster competency
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Comprehensive Coverage */}
            <Card
              variant="elevated"
              className="p-8 md:p-12 bg-gradient-to-br from-accent to-accent-600 border-accent/20 relative overflow-hidden"
            >
              <div className="flex items-start gap-6 relative z-10">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg transition-all duration-500">
                    {activeTab.coverage === "after" ? (
                      <BookOpenIcon className="h-8 w-8 text-white" />
                    ) : (
                      <EyeSlashIcon className="h-8 w-8 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  {/* Tab Navigation */}
                  <div className="flex space-x-2 mb-6">
                    <button
                      onClick={() =>
                        setActiveTab((prev) => ({
                          ...prev,
                          coverage: "before",
                        }))
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeTab.coverage === "before"
                          ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                          : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90"
                      }`}
                    >
                      Before
                    </button>
                    <button
                      onClick={() =>
                        setActiveTab((prev) => ({ ...prev, coverage: "after" }))
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeTab.coverage === "after"
                          ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                          : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90"
                      }`}
                    >
                      After
                    </button>
                  </div>

                  {/* Content Container */}
                  <div className="relative min-h-[220px]">
                    {/* Traditional Training Content */}
                    <div
                      className={`transition-all duration-500 ${
                        activeTab.coverage === "after"
                          ? "opacity-0 translate-y-4 absolute inset-0"
                          : "opacity-100 translate-y-0"
                      }`}
                    >
                      <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-sm">
                        Fragmented Training Materials
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6 text-white">
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            Scattered Information
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Incomplete knowledge of ingredients and
                                allergens
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Basic beverage knowledge without depth
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Limited wine pairing understanding
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Inconsistent procedure adherence
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            Theoretical Learning Only
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Abstract scenarios disconnected from reality
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Lack of confidence in customer interactions
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Missed upselling opportunities and revenue loss
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* QuizCrunch Content */}
                    <div
                      className={`transition-all duration-500 ${
                        activeTab.coverage === "after"
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 -translate-y-4 absolute inset-0"
                      }`}
                    >
                      <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-sm">
                        Comprehensive Knowledge Coverage
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6 text-white">
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            Four Essential Categories
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Food knowledge with ingredients and allergens
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Beverage expertise including cocktails and
                                spirits
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Wine knowledge for perfect pairings
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Procedure mastery for consistent service
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            Real-World Application
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Scenario-based questions mirror actual
                                situations
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Customer interaction practice builds confidence
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Upselling techniques increase revenue per table
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Management & Analytics */}
            <Card
              variant="elevated"
              className="p-8 md:p-12 bg-gradient-to-br from-secondary to-secondary-600 border-secondary/20 relative overflow-hidden"
            >
              <div className="flex items-start gap-6 relative z-10">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg transition-all duration-500">
                    {activeTab.analytics === "after" ? (
                      <ChartBarIcon className="h-8 w-8 text-white" />
                    ) : (
                      <DocumentTextIcon className="h-8 w-8 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  {/* Tab Navigation */}
                  <div className="flex space-x-2 mb-6">
                    <button
                      onClick={() =>
                        setActiveTab((prev) => ({
                          ...prev,
                          analytics: "before",
                        }))
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeTab.analytics === "before"
                          ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                          : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90"
                      }`}
                    >
                      Before
                    </button>
                    <button
                      onClick={() =>
                        setActiveTab((prev) => ({
                          ...prev,
                          analytics: "after",
                        }))
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeTab.analytics === "after"
                          ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                          : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90"
                      }`}
                    >
                      After
                    </button>
                  </div>

                  {/* Content Container */}
                  <div className="relative min-h-[220px]">
                    {/* Traditional Training Content */}
                    <div
                      className={`transition-all duration-500 ${
                        activeTab.analytics === "after"
                          ? "opacity-0 translate-y-4 absolute inset-0"
                          : "opacity-100 translate-y-0"
                      }`}
                    >
                      <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-sm">
                        Paper-Based Chaos
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6 text-white">
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            No Progress Visibility
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Outdated paper logs show no real-time data
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Knowledge gaps discovered only after mistakes
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                No data-driven insights for training decisions
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            Manual Management Burden
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Complex file organization and version control
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Individual staff tracking becomes overwhelming
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <XMarkIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Hours wasted on manual quiz preparation
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* QuizCrunch Content */}
                    <div
                      className={`transition-all duration-500 ${
                        activeTab.analytics === "after"
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 -translate-y-4 absolute inset-0"
                      }`}
                    >
                      <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-sm">
                        Advanced Management & Analytics
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6 text-white">
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            Real-Time Progress Tracking
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Live dashboard shows staff performance instantly
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Identify knowledge gaps before they impact
                                service
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Detailed analytics for informed training
                                decisions
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-bold mb-3 text-white drop-shadow-sm">
                            Effortless Management
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Upload menus and SOPs with simple drag-and-drop
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Manage multiple staff members from one dashboard
                              </span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-white" />
                              <span className="text-white/95 font-medium">
                                Automatic quiz generation saves hours of
                                preparation
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* The Science Behind It */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-dark-slate mb-6">
              The Science
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                {" "}
                Behind Success
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card variant="elevated" className="text-center p-6">
              <SparklesIcon className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dark-slate mb-3">
                AI Personalization
              </h3>
              <p className="text-sm text-muted-gray">
                Every question adapts to individual learning pace and knowledge
                gaps
              </p>
            </Card>

            <Card variant="elevated" className="text-center p-6">
              <AcademicCapIcon className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dark-slate mb-3">
                Microlearning
              </h3>
              <p className="text-sm text-muted-gray">
                Information delivered in digestible chunks for maximum retention
              </p>
            </Card>

            <Card variant="elevated" className="text-center p-6">
              <CogIcon className="h-12 w-12 text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dark-slate mb-3">
                Spaced Repetition
              </h3>
              <p className="text-sm text-muted-gray">
                Strategic review timing ensures long-term knowledge retention
              </p>
            </Card>

            <Card variant="elevated" className="text-center p-6">
              <UsersIcon className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dark-slate mb-3">
                Real-world Context
              </h3>
              <p className="text-sm text-muted-gray">
                Every lesson ties directly to actual restaurant scenarios
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-dark-slate mb-6">
              Proven
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                {" "}
                Results
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card
              variant="elevated"
              className="text-center p-8 bg-gradient-to-br from-primary to-primary-600 border-primary/20 shadow-xl"
            >
              <div className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
                95%
              </div>
              <h3 className="text-xl font-bold text-white mb-4 drop-shadow-sm">
                Knowledge Retention
              </h3>
              <p className="text-white/95 font-medium leading-relaxed">
                After 30 days, staff retain 95% of learned material vs 23% with
                traditional training
              </p>
            </Card>

            <Card
              variant="elevated"
              className="text-center p-8 bg-gradient-to-br from-accent to-accent-600 border-accent/20 shadow-xl"
            >
              <div className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
                3x
              </div>
              <h3 className="text-xl font-bold text-white mb-4 drop-shadow-sm">
                Faster Service
              </h3>
              <p className="text-white/95 font-medium leading-relaxed">
                New staff serve customers 3x faster with higher confidence and
                accuracy
              </p>
            </Card>

            <Card
              variant="elevated"
              className="text-center p-8 bg-gradient-to-br from-secondary to-secondary-600 border-secondary/20 shadow-xl"
            >
              <div className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
                85%
              </div>
              <h3 className="text-xl font-bold text-white mb-4 drop-shadow-sm">
                Cost Reduction
              </h3>
              <p className="text-white/95 font-medium leading-relaxed">
                Total training costs reduced by 85% while improving outcomes
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/5 via-white to-accent/5">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-light text-dark-slate mb-6 tracking-tight">
              Ready to
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                {" "}
                transform
              </span>
              <br />
              your training?
            </h2>
            <p className="text-xl text-muted-gray mb-12 font-light leading-relaxed">
              Join restaurants across the UK that have transformed their staff
              training with our proven accelerated learning method.
            </p>

            <div className="space-y-4">
              <Link
                to="/signup"
                className="inline-block bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-12 py-4 rounded-full text-lg font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                Start Your Training Revolution
              </Link>
              <p className="text-sm text-muted-gray">
                Setup takes less than 5 minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-dark-slate to-slate-800 text-slate-400 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <Link
              to="/"
              className="text-2xl font-light text-white mb-8 inline-block"
            >
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                QuizCrunch
              </span>
            </Link>

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

export default HowPage;
