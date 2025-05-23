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
                  <span className="text-sky-500">Bite-Sized Quizzes.</span> Big
                  Results.
                </h1>
                <p className="mt-4 text-lg md:text-xl text-slate-300 mb-10">
                  QuizCrunch empowers your restaurant or hotel staff with rapid,
                  repeatable quizzes designed for deep learning and confident
                  service.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
                  <Link to="/login">
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto px-10 py-3 text-lg rounded-lg text-sky-500 bg-transparent border-2 border-sky-500 hover:bg-sky-500 hover:text-slate-900 transition-colors duration-150 ease-in-out shadow-md hover:shadow-lg"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button
                      variant="primary"
                      className="w-full sm:w-auto px-10 py-3 text-lg rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors duration-150 ease-in-out shadow-md hover:shadow-lg"
                    >
                      Create Account
                    </Button>
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
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-700">
              Key Features
            </h2>
            <p className="text-md md:text-lg text-slate-500 mt-2">
              Discover how QuizCrunch can transform your restaurant operations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 bg-white shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-sky-100 text-sky-600 mx-auto shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-700 mb-3 text-center">
                Menu Management
              </h3>
              <p className="text-slate-600 text-center">
                Create and manage digital menus that your staff can learn from.
                Keep your team informed about ingredients, preparation methods,
                and allergens.
              </p>
            </Card>

            <Card className="p-6 bg-white shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-sky-100 text-sky-600 mx-auto shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-700 mb-3 text-center">
                Rapid Quiz Creation
              </h3>
              <p className="text-slate-600 text-center">
                Quickly generate engaging quizzes from your menu or knowledge
                base. Peritus uses smart repetition to ensure staff deeply learn
                and retain crucial information, leading to confident and
                knowledgeable service.
              </p>
            </Card>

            <Card className="p-6 bg-white shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-sky-100 text-sky-600 mx-auto shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-700 mb-3 text-center">
                Analytics
              </h3>
              <p className="text-slate-600 text-center">
                Track progress and see how quick, repetitive quizzes improve
                staff knowledge and reduce errors. Gain insights to optimize
                training and elevate service.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-sky-600">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap text-center justify-center">
            <div className="w-full lg:w-8/12 px-4">
              <h2 className="text-3xl md:text-4xl font-semibold text-white">
                Ready for Smarter, Faster Staff Training?
              </h2>
              <p className="text-lg md:text-xl leading-relaxed mt-4 mb-8 text-sky-100">
                Stop time-consuming manual training. Empower your team with
                QuizCrunch's quick, effective quizzes. Sign up today and see the
                difference.
              </p>
              <Link to="/signup">
                <Button
                  variant="white"
                  className="mt-4 px-10 py-3 text-lg rounded-lg shadow-md hover:shadow-lg hover:bg-slate-100 text-sky-700 transition-all"
                >
                  Create Your Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 pt-12 pb-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap text-center md:text-left">
            <div className="w-full md:w-6/12 px-4 mb-8 md:mb-0">
              <h4 className="text-3xl font-semibold text-white">QuizCrunch</h4>
              <h5 className="text-lg mt-1 mb-2 text-slate-400">
                Empowering restaurants with smarter training.
              </h5>
            </div>
            <div className="w-full md:w-6/12 px-4">
              <div className="flex flex-wrap items-top mb-6">
                <div className="w-full md:w-4/12 px-4 ml-auto mb-6 md:mb-0">
                  <span className="block uppercase text-slate-400 text-sm font-semibold mb-2">
                    Company
                  </span>
                  <ul className="list-unstyled">
                    <li>
                      <a
                        className="text-slate-300 hover:text-white font-medium block pb-2 text-sm"
                        href="#about"
                      >
                        About Us
                      </a>
                    </li>
                    <li>
                      <a
                        className="text-slate-300 hover:text-white font-medium block pb-2 text-sm"
                        href="#contact"
                      >
                        Contact
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="w-full md:w-4/12 px-4">
                  <span className="block uppercase text-slate-400 text-sm font-semibold mb-2">
                    Get Started
                  </span>
                  <ul className="list-unstyled">
                    <li>
                      <Link
                        className="text-slate-300 hover:text-white font-medium block pb-2 text-sm"
                        to="/login"
                      >
                        Sign In
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="text-slate-300 hover:text-white font-medium block pb-2 text-sm"
                        to="/signup"
                      >
                        Sign Up
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="text-slate-300 hover:text-white font-medium block pb-2 text-sm"
                        to="/#features"
                      >
                        Features
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <hr className="my-6 border-slate-700" />
          <div className="flex flex-wrap items-center md:justify-between justify-center">
            <div className="w-full md:w-4/12 px-4 mx-auto text-center">
              <div className="text-sm text-slate-400 py-1">
                Copyright © {new Date().getFullYear()} QuizCrunch Hospitality
                Solutions.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
