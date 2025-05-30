import React from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import Button from "../components/common/Button";
import { BookOpenIcon } from "@heroicons/react/24/outline";

const QuestionBankEditPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout
      breadcrumb={[
        { name: "Quiz Management", href: "/quiz-management" },
        { name: "Question Bank Edit" },
      ]}
    >
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <BookOpenIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Edit Question Bank
              </h1>
              <p className="text-slate-600 mt-2">
                Manage and edit your question banks
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center py-12">
            <BookOpenIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Question Bank Management
            </h3>
            <p className="text-slate-500 mb-6">
              Use the Quiz Management page to manage your question banks.
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

export default QuestionBankEditPage;
