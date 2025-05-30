import React from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import Button from "../components/common/Button";
import { AcademicCapIcon } from "@heroicons/react/24/outline";

const CreateQuizPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout
      breadcrumb={[
        { name: "Quiz Management", href: "/quiz-management" },
        { name: "Create Quiz" },
      ]}
    >
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <AcademicCapIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Create Quiz</h1>
              <p className="text-slate-600 mt-2">
                Create a new quiz from your question banks
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center py-12">
            <AcademicCapIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Quiz Creation
            </h3>
            <p className="text-slate-500 mb-6">
              Use the Quiz Management page to create quizzes from your question
              banks.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate("/quiz-management")}
            >
              Go to Quiz Management
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateQuizPage;
