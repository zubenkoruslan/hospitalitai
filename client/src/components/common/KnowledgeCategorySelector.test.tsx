import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import KnowledgeCategorySelector from "./KnowledgeCategorySelector";
import { KnowledgeCategory } from "../../types/questionBankTypes";

describe("KnowledgeCategorySelector", () => {
  const mockOnCategoryChange = jest.fn();
  const mockOnSubcategoriesChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    selectedCategory: KnowledgeCategory.FOOD_KNOWLEDGE,
    selectedSubcategories: [],
    onCategoryChange: mockOnCategoryChange,
    onSubcategoriesChange: mockOnSubcategoriesChange,
  };

  it("renders all knowledge categories", () => {
    render(<KnowledgeCategorySelector {...defaultProps} />);

    // Use getAllByText to handle multiple instances (one in button, one in accessibility text)
    expect(screen.getAllByText(/Food Knowledge/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Beverage Knowledge/i)).toBeInTheDocument();
    expect(screen.getByText(/Wine Knowledge/i)).toBeInTheDocument();
    expect(screen.getByText(/Procedures Knowledge/i)).toBeInTheDocument();
  });

  it("shows the selected category with proper styling", () => {
    render(<KnowledgeCategorySelector {...defaultProps} />);

    const foodButton = screen.getByRole("button", { pressed: true });
    expect(foodButton).toBeInTheDocument();
    expect(foodButton).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onCategoryChange when a different category is selected", () => {
    render(<KnowledgeCategorySelector {...defaultProps} />);

    const beverageCard = screen.getByText(/Beverage Knowledge/i);
    fireEvent.click(beverageCard);

    expect(mockOnCategoryChange).toHaveBeenCalledWith(
      KnowledgeCategory.BEVERAGE_KNOWLEDGE
    );
  });

  it("shows subcategory dropdown when a category is selected", () => {
    render(<KnowledgeCategorySelector {...defaultProps} />);

    expect(screen.getByText(/Add subcategory.../i)).toBeInTheDocument();
  });

  it("allows selecting subcategories through dropdown", async () => {
    render(<KnowledgeCategorySelector {...defaultProps} />);

    // Open the dropdown
    const dropdownButton = screen.getByText(/Add subcategory.../i);
    fireEvent.click(dropdownButton);

    // Wait for dropdown to open and show options
    await waitFor(() => {
      const dropdownOptions = screen.getAllByRole("button");
      const ingredientsOption = dropdownOptions.find(
        (button) =>
          button.textContent === "ingredients" &&
          button.className.includes("hover:bg-gray-100")
      );
      expect(ingredientsOption).toBeInTheDocument();
    });

    // Click on the dropdown option specifically
    const dropdownOptions = screen.getAllByRole("button");
    const ingredientsOption = dropdownOptions.find(
      (button) =>
        button.textContent === "ingredients" &&
        button.className.includes("hover:bg-gray-100")
    );
    if (ingredientsOption) {
      fireEvent.click(ingredientsOption);
    }

    expect(mockOnSubcategoriesChange).toHaveBeenCalledWith(["ingredients"]);
  });

  it("displays selected subcategories as tags", () => {
    const propsWithSelectedSubs = {
      ...defaultProps,
      selectedSubcategories: ["ingredients", "allergens"],
    };

    render(<KnowledgeCategorySelector {...propsWithSelectedSubs} />);

    // Check that selected subcategories appear as tags
    expect(screen.getByText("ingredients")).toBeInTheDocument();
    expect(screen.getByText("allergens")).toBeInTheDocument();
  });

  it("allows removing subcategories using tag remove buttons", () => {
    const propsWithSelectedSubs = {
      ...defaultProps,
      selectedSubcategories: ["ingredients"],
    };

    render(<KnowledgeCategorySelector {...propsWithSelectedSubs} />);

    // Find and click the remove button for ingredients
    const removeButton = screen.getByLabelText(/Remove ingredients/i);
    fireEvent.click(removeButton);

    expect(mockOnSubcategoriesChange).toHaveBeenCalledWith([]);
  });

  it("shows required indicator when required prop is true", () => {
    render(<KnowledgeCategorySelector {...defaultProps} required={true} />);

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("disables dropdown when maximum subcategories (3) are selected", () => {
    const propsWithMaxSubs = {
      ...defaultProps,
      selectedSubcategories: ["ingredients", "allergens", "preparation"],
    };

    render(<KnowledgeCategorySelector {...propsWithMaxSubs} />);

    expect(
      screen.getByText(/Maximum subcategories selected/i)
    ).toBeInTheDocument();

    const dropdownButton = screen
      .getByText(/Maximum subcategories selected/i)
      .closest("button");
    expect(dropdownButton).toBeDisabled();
  });

  it("disables interaction when disabled prop is true", () => {
    render(<KnowledgeCategorySelector {...defaultProps} disabled={true} />);

    const beverageCard = screen.getByText(/Beverage Knowledge/i);
    fireEvent.click(beverageCard);

    // Should not call the change handler when disabled
    expect(mockOnCategoryChange).not.toHaveBeenCalled();
  });

  it("shows proper accessibility information", () => {
    const propsWithSelectedSubs = {
      ...defaultProps,
      selectedSubcategories: ["ingredients"],
    };

    render(<KnowledgeCategorySelector {...propsWithSelectedSubs} />);

    // Check for screen reader information
    expect(
      screen.getByText(/Selected knowledge category: Food Knowledge/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 subcategories selected: ingredients/i)
    ).toBeInTheDocument();
  });

  it("switches subcategory options when different category is selected", () => {
    const { rerender } = render(
      <KnowledgeCategorySelector {...defaultProps} />
    );

    // Initially shows food knowledge dropdown
    expect(screen.getByText(/Add subcategory.../i)).toBeInTheDocument();

    // Switch to wine knowledge
    const wineProps = {
      ...defaultProps,
      selectedCategory: KnowledgeCategory.WINE_KNOWLEDGE,
    };

    rerender(<KnowledgeCategorySelector {...wineProps} />);

    // Open dropdown to check wine subcategories are available
    const dropdownButton = screen.getByText(/Add subcategory.../i);
    fireEvent.click(dropdownButton);

    waitFor(() => {
      // Should show wine-specific subcategories
      expect(
        screen.getByRole("button", { name: /varieties/i })
      ).toBeInTheDocument();
    });
  });
});
