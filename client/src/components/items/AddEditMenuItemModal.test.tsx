import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AddEditMenuItemModal from "./AddEditMenuItemModal";
import {
  FOOD_CATEGORIES,
  BEVERAGE_CATEGORIES,
} from "../../types/menuItemTypes";

// Mock child components
jest.mock(
  "../common/ErrorMessage",
  () =>
    ({ message }: { message: string }) =>
      <div data-testid="error-message">{message}</div>
);
jest.mock("../common/LoadingSpinner", () => () => (
  <div data-testid="loading-spinner">Loading...</div>
));

const mockOnClose = jest.fn();
const mockOnSubmit = jest.fn();

const mockRestaurantId = "rest123";
const mockMenuId = "menu456";

const baseProps = {
  isOpen: true,
  onClose: mockOnClose,
  onSubmit: mockOnSubmit,
  menuId: mockMenuId,
  restaurantId: mockRestaurantId,
  isSubmitting: false,
};

const mockFoodItem = {
  _id: "item1",
  restaurantId: mockRestaurantId,
  menuId: mockMenuId,
  name: "Test Burger",
  description: "A tasty burger",
  price: 9.99,
  ingredients: ["bun", "patty", "lettuce"],
  itemType: "food" as const,
  category: FOOD_CATEGORIES[0],
  isGlutenFree: false,
  isDairyFree: false,
  isVegetarian: false,
  isVegan: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockBeverageItem = {
  ...mockFoodItem,
  _id: "item2",
  name: "Test Soda",
  description: "A fizzy drink",
  price: 1.99,
  ingredients: ["water", "sugar", "bubbles"],
  itemType: "beverage" as const,
  category: BEVERAGE_CATEGORIES[0],
  isGlutenFree: true,
  isDairyFree: true,
  isVegetarian: true,
  isVegan: true,
};

describe("AddEditMenuItemModal", () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSubmit.mockClear();
  });

  // --- Rendering Tests ---

  it("does not render when isOpen is false", () => {
    render(
      <AddEditMenuItemModal {...baseProps} isOpen={false} currentItem={null} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders correctly in Add mode when open", () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={null} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add New Menu Item")).toBeInTheDocument();

    // Check for key form fields (empty initially)
    expect(screen.getByLabelText(/Name/)).toHaveValue("");
    expect(screen.getByLabelText(/Description/)).toHaveValue("");
    expect(screen.getByLabelText(/Price/)).toHaveValue(""); // Note: input type="number" can have empty string value
    expect(screen.getByLabelText(/Ingredients/)).toHaveValue("");
    expect(screen.getByLabelText(/Item Type/)).toHaveValue("");
    expect(screen.getByLabelText(/Category/)).toBeDisabled(); // Disabled until type is selected
    expect(screen.getByLabelText(/Gluten Free/)).not.toBeChecked();
    // ... check other flags

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add Item" })
    ).toBeInTheDocument();
  });

  it("renders correctly in Edit mode when open and populates form (Food Item)", () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={mockFoodItem} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit Menu Item")).toBeInTheDocument();

    // Check form fields are populated
    expect(screen.getByLabelText(/Name/)).toHaveValue(mockFoodItem.name);
    expect(screen.getByLabelText(/Description/)).toHaveValue(
      mockFoodItem.description
    );
    expect(screen.getByLabelText(/Price/)).toHaveValue(mockFoodItem.price);
    expect(screen.getByLabelText(/Ingredients/)).toHaveValue(
      mockFoodItem.ingredients.join(", ")
    );
    expect(screen.getByLabelText(/Item Type/)).toHaveValue(
      mockFoodItem.itemType
    );
    expect(screen.getByLabelText(/Category/)).toHaveValue(
      mockFoodItem.category
    );
    expect(screen.getByLabelText(/Gluten Free/)).not.toBeChecked();
    // ... check other flags based on mockFoodItem

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeInTheDocument();
  });

  it("renders correctly in Edit mode when open and populates form (Beverage Item)", () => {
    render(
      <AddEditMenuItemModal {...baseProps} currentItem={mockBeverageItem} />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit Menu Item")).toBeInTheDocument();

    // Check form fields are populated
    expect(screen.getByLabelText(/Name/)).toHaveValue(mockBeverageItem.name);
    expect(screen.getByLabelText(/Item Type/)).toHaveValue(
      mockBeverageItem.itemType
    );
    expect(screen.getByLabelText(/Category/)).toHaveValue(
      mockBeverageItem.category
    );
    expect(screen.getByLabelText(/Gluten Free/)).toBeChecked();
    expect(screen.getByLabelText(/Dairy Free/)).toBeChecked();
    expect(screen.getByLabelText(/Vegetarian/)).toBeChecked();
    expect(screen.getByLabelText(/Vegan/)).toBeChecked();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeInTheDocument();
  });

  // --- Interaction Tests (will be added next) ---

  it("calls onClose when Cancel button is clicked", () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("updates form state on input change", () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={null} />);
    const nameInput = screen.getByLabelText(/Name/);
    const descriptionInput = screen.getByLabelText(/Description/);

    fireEvent.change(nameInput, { target: { value: "New Item Name" } });
    fireEvent.change(descriptionInput, {
      target: { value: "New Description" },
    });

    expect(nameInput).toHaveValue("New Item Name");
    expect(descriptionInput).toHaveValue("New Description");
  });

  it("enables and populates category dropdown when item type is selected", () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={null} />);
    const typeSelect = screen.getByLabelText(/Item Type/);
    const categorySelect = screen.getByLabelText(
      /Category/
    ) as HTMLSelectElement;

    expect(categorySelect).toBeDisabled();

    // Select Food
    fireEvent.change(typeSelect, { target: { value: "food" } });
    expect(categorySelect).toBeEnabled();
    // Check if food categories are populated (check the first one)
    expect(
      screen.getByRole("option", { name: /Appetizer/i })
    ).toBeInTheDocument(); // Assuming FOOD_CATEGORIES[0] is 'appetizer'
    expect(
      screen.queryByRole("option", { name: /Soft Drink/i })
    ).not.toBeInTheDocument(); // Beverage category shouldn't be there

    // Select Beverage
    fireEvent.change(typeSelect, { target: { value: "beverage" } });
    expect(categorySelect).toBeEnabled();
    // Check if beverage categories are populated
    expect(
      screen.getByRole("option", { name: /Soft Drink/i })
    ).toBeInTheDocument(); // Assuming BEVERAGE_CATEGORIES[0] is 'soft_drink'
    expect(
      screen.queryByRole("option", { name: /Appetizer/i })
    ).not.toBeInTheDocument(); // Food category shouldn't be there

    // Select back to empty
    fireEvent.change(typeSelect, { target: { value: "" } });
    expect(categorySelect).toBeDisabled();
  });

  it("resets category when item type changes", () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={null} />);
    const typeSelect = screen.getByLabelText(/Item Type/);
    const categorySelect = screen.getByLabelText(
      /Category/
    ) as HTMLSelectElement;

    // Set type to food and select a category
    fireEvent.change(typeSelect, { target: { value: "food" } });
    fireEvent.change(categorySelect, { target: { value: FOOD_CATEGORIES[1] } });
    expect(categorySelect).toHaveValue(FOOD_CATEGORIES[1]);

    // Change type to beverage - category should reset
    fireEvent.change(typeSelect, { target: { value: "beverage" } });
    expect(categorySelect).toHaveValue(""); // Category resets to default empty option
  });

  it("updates dietary flags correctly", () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={null} />);
    const glutenFreeCheckbox = screen.getByLabelText(/Gluten Free/);
    const veganCheckbox = screen.getByLabelText(/Vegan/);
    const vegetarianCheckbox = screen.getByLabelText(/Vegetarian/);

    // Check initial state
    expect(glutenFreeCheckbox).not.toBeChecked();
    expect(veganCheckbox).not.toBeChecked();
    expect(vegetarianCheckbox).not.toBeChecked();
    expect(vegetarianCheckbox).toBeEnabled();

    // Check Gluten Free
    fireEvent.click(glutenFreeCheckbox);
    expect(glutenFreeCheckbox).toBeChecked();

    // Check Vegan -> should also check Vegetarian and disable it
    fireEvent.click(veganCheckbox);
    expect(veganCheckbox).toBeChecked();
    expect(vegetarianCheckbox).toBeChecked();
    expect(vegetarianCheckbox).toBeDisabled();

    // Uncheck Vegan -> should uncheck Vegan, keep Vegetarian checked, and enable Vegetarian
    fireEvent.click(veganCheckbox);
    expect(veganCheckbox).not.toBeChecked();
    expect(vegetarianCheckbox).toBeChecked(); // Stays checked
    expect(vegetarianCheckbox).toBeEnabled(); // Becomes enabled again

    // Explicitly uncheck Vegetarian (when Vegan is false)
    fireEvent.click(vegetarianCheckbox);
    expect(vegetarianCheckbox).not.toBeChecked();
  });

  // --- Submission and Validation Tests (will be added next) ---

  it("calls onSubmit with correct data in Add mode when form is valid", async () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={null} />);

    // Fill the form with valid data
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Valid Name" },
    });
    fireEvent.change(screen.getByLabelText(/Item Type/), {
      target: { value: "food" },
    });
    fireEvent.change(screen.getByLabelText(/Category/), {
      target: { value: FOOD_CATEGORIES[0] },
    });
    fireEvent.change(screen.getByLabelText(/Price/), {
      target: { value: "10.50" },
    });
    fireEvent.change(screen.getByLabelText(/Ingredients/), {
      target: { value: "ing1, ing2" },
    });
    fireEvent.click(screen.getByLabelText(/Gluten Free/));

    // Submit
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));

    // Check if onSubmit was called correctly
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Valid Name",
          itemType: "food",
          category: FOOD_CATEGORIES[0],
          price: "10.50",
          ingredients: "ing1, ing2",
          isGlutenFree: true,
          isDairyFree: false,
          isVegetarian: false,
          isVegan: false,
        }),
        null // currentItemId is null in Add mode
      );
    });
    expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
  });

  it("calls onSubmit with correct data in Edit mode when form is valid", async () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={mockFoodItem} />);
    const updatedName = "Updated Burger Name";

    // Modify some data
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: updatedName },
    });
    fireEvent.click(screen.getByLabelText(/Vegan/)); // This should also check Vegetarian

    // Submit
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    // Check if onSubmit was called correctly
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: updatedName,
          itemType: mockFoodItem.itemType,
          category: mockFoodItem.category,
          price: mockFoodItem.price.toString(),
          ingredients: mockFoodItem.ingredients.join(", "),
          isGlutenFree: mockFoodItem.isGlutenFree,
          isDairyFree: mockFoodItem.isDairyFree,
          isVegetarian: true, // Auto-checked due to Vegan
          isVegan: true,
        }),
        mockFoodItem._id // currentItemId is the ID in Edit mode
      );
    });
    expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
  });

  it("shows validation errors for required fields", () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={null} />);

    // Attempt to submit without filling required fields
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));

    // Check for error messages (can check for one or more)
    expect(screen.getByTestId("error-message")).toHaveTextContent(
      "Item name is required."
    );
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // Fill name, try again
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Some Name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    expect(screen.getByTestId("error-message")).toHaveTextContent(
      "Item type is required."
    );
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // Fill type, try again
    fireEvent.change(screen.getByLabelText(/Item Type/), {
      target: { value: "food" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    expect(screen.getByTestId("error-message")).toHaveTextContent(
      "Category is required."
    );
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid price", () => {
    render(<AddEditMenuItemModal {...baseProps} currentItem={null} />);

    // Fill required fields but invalid price
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Valid Name" },
    });
    fireEvent.change(screen.getByLabelText(/Item Type/), {
      target: { value: "food" },
    });
    fireEvent.change(screen.getByLabelText(/Category/), {
      target: { value: FOOD_CATEGORIES[0] },
    });
    fireEvent.change(screen.getByLabelText(/Price/), {
      target: { value: "not-a-number" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));

    // Check for error
    expect(screen.getByTestId("error-message")).toHaveTextContent(
      "Price must be a valid number."
    );
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("disables buttons and shows spinner when isSubmitting is true", () => {
    render(
      <AddEditMenuItemModal
        {...baseProps}
        currentItem={null}
        isSubmitting={true}
      />
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const submitButton = screen.getByRole("button", { name: /Add Item/ }); // Find by initial text before it changes potentially

    expect(cancelButton).toBeInTheDocument(); // Cancel might not be disabled, depends on UX choice, check component code
    // expect(cancelButton).toBeDisabled(); // Uncomment if Cancel should be disabled too
    expect(submitButton).toBeDisabled();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    // Check the submit button's content if it changes text AND includes the spinner
    expect(submitButton).toContainElement(
      screen.getByTestId("loading-spinner")
    );
  });
});
