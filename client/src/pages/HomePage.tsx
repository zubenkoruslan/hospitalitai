import React from "react";
import { Link } from "react-router-dom";
import ErrorMessage from "../components/common/ErrorMessage";
import Button from "../components/common/Button";
import Card from "../components/common/Card";

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Hero Section */}
      <div className="relative pt-20 pb-24 md:pt-32 md:pb-40 flex content-center items-center justify-center bg-slate-900 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center">
            <div className="w-full lg:w-7/12 px-4 ml-auto mr-auto text-center">
              <div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-100 mb-6">
                  Boost Staff Knowledge.{" "}
                  <span className="text-blue-500">Bite-Sized Quizzes.</span> Big
                  Results.
                </h1>
                <p className="mt-4 text-lg md:text-xl text-slate-300 mb-10">
                  QuizCrunch empowers your restaurant or hotel staff with rapid,
                  repeatable quizzes designed for deep learning and confident
                  service.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/signup"
                    className="w-full sm:w-auto px-10 py-3 text-lg rounded-lg text-blue-500 bg-transparent border-2 border-blue-500 hover:bg-blue-500 hover:text-slate-900 transition-colors duration-150 ease-in-out shadow-md hover:shadow-lg text-center"
                  >
                    Get Started
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-10 py-3 text-lg rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150 ease-in-out shadow-md hover:shadow-lg text-center"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-slate-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap">
            <div className="lg:pt-12 pt-6 w-full md:w-4/12 px-4 text-center">
              <Card className="p-6 bg-white shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-blue-100 text-blue-600 mx-auto shadow-md">
                  <svg
                    className="w-8 h-8"
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
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  Smart Quiz Generation
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  AI-powered quiz creation from your restaurant menus and SOPs.
                  Turn your content into engaging learning experiences
                  automatically.
                </p>
              </Card>
            </div>

            <div className="w-full md:w-4/12 px-4 text-center">
              <Card className="p-6 bg-white shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-blue-100 text-blue-600 mx-auto shadow-md">
                  <svg
                    className="w-8 h-8"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  Real-Time Analytics
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Track staff progress, identify knowledge gaps, and measure
                  training effectiveness with detailed performance analytics and
                  reporting.
                </p>
              </Card>
            </div>

            <div className="pt-6 w-full md:w-4/12 px-4 text-center">
              <Card className="p-6 bg-white shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-blue-100 text-blue-600 mx-auto shadow-md">
                  <svg
                    className="w-8 h-8"
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
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  Easy Integration
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Seamlessly integrate with your existing training workflows.
                  Upload documents, create custom content, and deploy quizzes in
                  minutes.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <div className="w-full lg:w-6/12 mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Staff Training?
            </h2>
            <p className="text-lg text-blue-100 mb-8">
              Join hundreds of restaurants and hotels that have revolutionized
              their training programs with intelligent quizzing.
            </p>
            <Link
              to="/signup"
              className="mt-4 px-10 py-3 text-lg rounded-lg shadow-md hover:shadow-lg hover:bg-slate-100 text-blue-700 transition-all bg-white font-semibold"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 pt-12 pb-8">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">HospitalityAI</h3>
          <p className="text-slate-400 mb-6">
            Empowering hospitality staff through intelligent training solutions.
          </p>
          <div className="flex justify-center space-x-6">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
