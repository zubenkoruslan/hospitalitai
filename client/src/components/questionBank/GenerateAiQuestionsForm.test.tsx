import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GenerateAiQuestionsForm from "./GenerateAiQuestionsForm";
import { ValidationContext } from "../../context/ValidationContext";
import * as apiService from "../../services/api";
import { IQuestion } from "../../types/questionBankTypes";

// Mock API service
jest.mock("../../services/api", () => ({
  generateAiQuestions: jest.fn(),
}));

// Mock common components
jest.mock("../common/Button", () => (props: any) => <button {...props} />);
jest.mock("../common/LoadingSpinner", () => () => (
  <div data-testid="loading-spinner">Loading...</div>
));

const mockOnAiQuestionsGenerated = jest.fn();
const mockOnCloseRequest = jest.fn();

const mockValidationContextValue = {
  formatErrorMessage: jest.fn(
    (err) =>
      err?.response?.data?.message ||
      err?.message ||
      "An unexpected error occurred."
  ),
};

const defaultBankCategories = ["Wine", "Cheese"];
const defaultProps = {
  bankId: "bank123",
  bankCategories: defaultBankCategories,
  onAiQuestionsGenerated: mockOnAiQuestionsGenerated,
  onCloseRequest: mockOnCloseRequest,
};

const renderComponent = (props = {}) => {
  return render(
    <ValidationContext.Provider value={mockValidationContextValue as any}>
      <GenerateAiQuestionsForm {...defaultProps} {...props} />
    </ValidationContext.Provider>
  );
};

describe("GenerateAiQuestionsForm Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.generateAiQuestions as jest.Mock).mockResolvedValue([
      {
        _id: "aiQ1",
        questionText: "AI Question 1" /* ...other IQuestion fields */,
      } as IQuestion,
    ]);
  });

  test("renders initial form elements and pre-fills categories", () => {
    renderComponent();
    expect(screen.getByLabelText(/Categories for AI Generation/i)).toHaveValue(
      defaultBankCategories.join(", ")
    );
    expect(
      screen.getByLabelText(/Number of Questions to Generate/i)
    ).toHaveValue(5); // Default value
    expect(screen.getByLabelText(/Additional Context/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate Questions" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByText(
        `Suggested from bank: ${defaultBankCategories.join(", ")}`
      )
    ).toBeInTheDocument();
  });

  test("allows input for all fields", async () => {
    renderComponent();
    const categoriesInput = screen.getByLabelText(
      /Categories for AI Generation/i
    );
    const countInput = screen.getByLabelText(
      /Number of Questions to Generate/i
    );
    const contextInput = screen.getByLabelText(/Additional Context/i);

    await userEvent.clear(categoriesInput);
    await userEvent.type(categoriesInput, "Spirits, Cocktails");
    expect(categoriesInput).toHaveValue("Spirits, Cocktails");

    await userEvent.clear(countInput);
    await userEvent.type(countInput, "7");
    expect(countInput).toHaveValue(7);

    await userEvent.type(contextInput, "Focus on rum-based drinks.");
    expect(contextInput).toHaveValue("Focus on rum-based drinks.");
  });

  describe("Validation", () => {
    test("shows error if categories are empty on submit", async () => {
      renderComponent();
      await userEvent.clear(
        screen.getByLabelText(/Categories for AI Generation/i)
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Generate Questions" })
      );
      expect(
        await screen.findByText(
          "Please provide at least one category for AI generation."
        )
      ).toBeInTheDocument();
      expect(apiService.generateAiQuestions).not.toHaveBeenCalled();
    });

    test("shows error if target question count is zero or negative", async () => {
      renderComponent();
      const countInput = screen.getByLabelText(
        /Number of Questions to Generate/i
      );
      await userEvent.clear(countInput);
      await userEvent.type(countInput, "0");
      fireEvent.click(
        screen.getByRole("button", { name: "Generate Questions" })
      );
      expect(
        await screen.findByText(
          "Target question count must be a positive number."
        )
      ).toBeInTheDocument();
      expect(apiService.generateAiQuestions).not.toHaveBeenCalled();

      await userEvent.clear(countInput);
      await userEvent.type(countInput, "-2");
      fireEvent.click(
        screen.getByRole("button", { name: "Generate Questions" })
      );
      expect(
        await screen.findByText(
          "Target question count must be a positive number."
        )
      ).toBeInTheDocument();
      expect(apiService.generateAiQuestions).not.toHaveBeenCalled();
    });
  });

  test("submits form successfully with valid data", async () => {
    const generatedQuestionsMock: IQuestion[] = [
      {
        _id: "aiQ1",
        questionText: "Generated Q1",
        restaurantId: "res123",
        createdBy: "ai",
        options: [],
        categories: ["Test"],
        questionType: "multiple-choice-single",
        createdAt: "date",
        updatedAt: "date",
      },
    ];
    (apiService.generateAiQuestions as jest.Mock).mockResolvedValue(
      generatedQuestionsMock
    );
    renderComponent();

    const categories = "Desserts, Pastries";
    const count = 3;
    const context = "Seasonal items.";

    await userEvent.clear(
      screen.getByLabelText(/Categories for AI Generation/i)
    );
    await userEvent.type(
      screen.getByLabelText(/Categories for AI Generation/i),
      categories
    );
    await userEvent.clear(
      screen.getByLabelText(/Number of Questions to Generate/i)
    );
    await userEvent.type(
      screen.getByLabelText(/Number of Questions to Generate/i),
      count.toString()
    );
    await userEvent.type(screen.getByLabelText(/Additional Context/i), context);

    fireEvent.click(screen.getByRole("button", { name: "Generate Questions" }));

    await waitFor(() => {
      expect(apiService.generateAiQuestions).toHaveBeenCalledWith({
        categories: categories.split(", ").map((c) => c.trim()),
        targetQuestionCount: count,
        menuContext: context,
        bankId: defaultProps.bankId,
      });
    });
    expect(mockOnAiQuestionsGenerated).toHaveBeenCalledWith(
      generatedQuestionsMock
    );
  });

  test("handles API error on submission", async () => {
    const errorMessage = "AI generation failed utterly.";
    (apiService.generateAiQuestions as jest.Mock).mockRejectedValueOnce({
      response: { data: { message: errorMessage } },
    });
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "Generate Questions" }));

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(mockOnAiQuestionsGenerated).not.toHaveBeenCalled();
  });

  test("shows error if AI generates no questions", async () => {
    (apiService.generateAiQuestions as jest.Mock).mockResolvedValue([]); // Empty array response
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "Generate Questions" }));

    expect(
      await screen.findByText(
        "The AI did not generate any questions for the given criteria. Try adjusting the categories or context."
      )
    ).toBeInTheDocument();
    expect(mockOnAiQuestionsGenerated).not.toHaveBeenCalled();
  });

  test("calls onCloseRequest when Cancel button is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnCloseRequest).toHaveBeenCalledTimes(1);
  });

  test("shows loading spinner during submission", async () => {
    (apiService.generateAiQuestions as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
    );
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Generate Questions" }));
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument()
    );
  });
});
