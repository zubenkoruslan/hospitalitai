import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import MenuItemList from "./MenuItemList";
import { MenuItem, FOOD_CATEGORIES } from "../../types/menuItemTypes";

// Mock the action buttons if they are separate components or complex
// jest.mock('../path/to/EditButton', () => (props) => <button onClick={props.onClick}>Mock Edit</button>);
// jest.mock('../path/to/DeleteButton', () => (props) => <button onClick={props.onClick}>Mock Delete</button>);

const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();

const mockItems: MenuItem[] = [
  {
    _id: "item1",
    restaurantId: "rest1",
    menuId: "menu1",
    name: "Cheeseburger",
    description: "Classic beef burger with cheese",
    price: 12.5,
    ingredients: ["beef patty", "cheese", "bun", "lettuce", "tomato"],
    itemType: "food",
    category: FOOD_CATEGORIES[0], // e.g., 'burgers'
    isGlutenFree: false,
    isDairyFree: false,
    isVegetarian: false,
    isVegan: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "item2",
    restaurantId: "rest1",
    menuId: "menu1",
    name: "French Fries",
    description: "Crispy golden fries",
    price: 4.0,
    itemType: "food",
    category: FOOD_CATEGORIES[1], // e.g., 'sides'
    isGlutenFree: true,
    isDairyFree: true,
    isVegetarian: true,
    isVegan: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultProps = {
  items: mockItems,
  onEdit: mockOnEdit,
  onDelete: mockOnDelete,
};

describe("MenuItemList", () => {
  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
  });

  it("renders the list of menu items correctly", () => {
    render(<MenuItemList {...defaultProps} />);

    // Check if item names are rendered
    expect(screen.getByText(mockItems[0].name)).toBeInTheDocument();
    expect(screen.getByText(mockItems[1].name)).toBeInTheDocument();

    // Check if other details like price are rendered (optional, depends on UI)
    expect(
      screen.getByText(`$${(mockItems[0].price ?? 0).toFixed(2)}`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(`$${(mockItems[1].price ?? 0).toFixed(2)}`)
    ).toBeInTheDocument();

    // Check if action buttons are present for each item
    // Use more specific selectors if needed (e.g., within the item row)
    expect(screen.getAllByRole("button", { name: /Edit/i })).toHaveLength(
      mockItems.length
    );
    expect(screen.getAllByRole("button", { name: /Delete/i })).toHaveLength(
      mockItems.length
    );

    // Check that the empty message is not shown
    expect(
      screen.queryByText(/No menu items added yet/i)
    ).not.toBeInTheDocument();
  });

  it("displays dietary flags correctly for items", () => {
    render(<MenuItemList {...defaultProps} />);

    // For mockItems[0] (Cheeseburger) - all flags are false
    const cheeseburgerCard = screen
      .getByText(mockItems[0].name)
      .closest("div.bg-white");
    expect(cheeseburgerCard).toBeInTheDocument();
    expect(cheeseburgerCard).toBeInstanceOf(HTMLElement);
    if (cheeseburgerCard) {
      expect(
        within(cheeseburgerCard as HTMLElement).queryByText("GF")
      ).not.toBeInTheDocument();
      expect(
        within(cheeseburgerCard as HTMLElement).queryByText("DF")
      ).not.toBeInTheDocument();
      expect(
        within(cheeseburgerCard as HTMLElement).queryByText("V")
      ).not.toBeInTheDocument();
      expect(
        within(cheeseburgerCard as HTMLElement).queryByText("VG")
      ).not.toBeInTheDocument();
    }

    // For mockItems[1] (French Fries) - all flags are true
    const friesCard = screen
      .getByText(mockItems[1].name)
      .closest("div.bg-white");
    expect(friesCard).toBeInTheDocument();
    expect(friesCard).toBeInstanceOf(HTMLElement);
    if (friesCard) {
      expect(
        within(friesCard as HTMLElement).getByText("GF")
      ).toBeInTheDocument();
      expect(
        within(friesCard as HTMLElement).getByText("DF")
      ).toBeInTheDocument();
      expect(
        within(friesCard as HTMLElement).getByText("V")
      ).toBeInTheDocument();
      expect(
        within(friesCard as HTMLElement).getByText("VG")
      ).toBeInTheDocument();
    }
  });

  it("renders a message when the item list is empty", () => {
    render(<MenuItemList {...defaultProps} items={[]} />);

    expect(screen.getByText(/No menu items added yet/i)).toBeInTheDocument();
    expect(screen.queryByText(mockItems[0].name)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Edit/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Delete/i })
    ).not.toBeInTheDocument();
  });

  // Add interaction tests next...
  it("calls onEdit with the correct item when Edit button is clicked", () => {
    render(<MenuItemList {...defaultProps} />);

    // Find all edit buttons and click the first one:
    const editButtons = screen.getAllByRole("button", { name: /Edit/i });

    fireEvent.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(mockItems[0]);
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it("calls onDelete with the correct item when Delete button is clicked", () => {
    render(<MenuItemList {...defaultProps} />);

    // Find the Delete button associated with the second item
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });

    fireEvent.click(deleteButtons[1]);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith(mockItems[1]);
    expect(mockOnEdit).not.toHaveBeenCalled();
  });
});
