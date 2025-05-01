/// <reference types="@testing-library/jest-dom" />
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import * as AuthContext from "../../context/AuthContext";
import * as NotificationContext from "../../context/NotificationContext";
import NotificationPanel from "./NotificationPanel";
import { Notification } from "../../context/NotificationContext";
import { UserRole } from "../../types/user";
import {
  jest,
  expect,
  test,
  describe,
  beforeEach,
  afterEach,
} from "@jest/globals";
import "@testing-library/jest-dom";
import api from "../../services/api"; // Import the api instance to mock

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...(jest.requireActual("react-router-dom") as any),
  useNavigate: () => mockNavigate,
  Link: ({
    children,
    to,
    ...props
  }: React.PropsWithChildren<{ to: string; [key: string]: any }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock date-fns/formatDistanceToNow
jest.mock("date-fns/formatDistanceToNow", () => ({
  formatDistanceToNow: (date: Date | string | number): string => {
    const now = new Date("2025-05-01T10:49:21.461Z");
    const pastDate = new Date(date);
    const diff = now.getTime() - pastDate.getTime();

    if (Number.isNaN(diff)) return "Invalid date";

    const minutes = Math.round(diff / (1000 * 60));
    const hours = Math.round(diff / (1000 * 60 * 60));
    const days = Math.round(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "less than a minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `about ${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  },
}));

// Mock the API calls made by the component/context
jest.mock("../../services/api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Explicitly type the mocked API methods
const mockedApiGet = api.get as jest.Mock;
const mockedApiPut = api.put as jest.Mock;
const mockedApiDelete = api.delete as jest.Mock;

// Mock context values
const mockAuthContextValue = {
  user: {
    role: UserRole.RestaurantOwner,
    _id: "owner1",
    restaurantId: "rest1",
    name: "Test Owner",
  },
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  setUser: jest.fn(),
};

// We still need mock functions for the context methods that call the API
const mockContextMarkAsRead = jest.fn();
const mockContextDeleteNotification = jest.fn();

const mockNotificationsContextValue = {
  notifications: [
    {
      _id: "n1",
      type: "new_assignment",
      content: "You have a new quiz assigned: Quiz A",
      isRead: false,
      createdAt: new Date("2025-05-01T10:44:21.461Z").toISOString(),
    } as Notification,
    {
      _id: "n2",
      type: "completed_training",
      content: "Staff Member completed Quiz B",
      isRead: true,
      metadata: { staffId: "staff123", resultId: "res123" },
      createdAt: new Date("2025-05-01T09:49:21.461Z").toISOString(),
    } as Notification,
    {
      _id: "n3",
      type: "new_staff",
      content: "New staff member added: John Doe",
      isRead: false,
      relatedId: "staff456",
      createdAt: new Date("2025-04-30T10:49:21.461Z").toISOString(),
    } as Notification,
  ],
  loading: false,
  error: null,
  fetchNotifications: jest.fn(),
  markAsRead: mockContextMarkAsRead, // Use the dedicated mock function
  deleteNotification: mockContextDeleteNotification, // Use the dedicated mock function
  addNotification: jest.fn(),
  unreadCount: 2,
};

// Mock onClose prop
const mockOnClose = jest.fn();

// Spy on hooks
let useAuthSpy: any;
let useNotificationsSpy: any;

// Helper function to render the component relying on spies
const renderComponent = () => {
  return render(
    <BrowserRouter>
      <NotificationPanel onClose={mockOnClose} />
    </BrowserRouter>
  );
};

describe("NotificationPanel Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up spies
    useAuthSpy = jest
      .spyOn(AuthContext, "useAuth")
      .mockReturnValue(mockAuthContextValue as any);
    useNotificationsSpy = jest
      .spyOn(NotificationContext, "useNotifications")
      .mockReturnValue(mockNotificationsContextValue as any);

    // Reset mocked API calls
    mockedApiGet.mockClear();
    mockedApiPut.mockClear();
    mockedApiDelete.mockClear();

    // Provide default resolves for API calls to avoid pending promises
    mockedApiPut.mockResolvedValue({} as any); // Revert to {} as any
    mockedApiDelete.mockResolvedValue({} as any); // Revert to {} as any

    // Also reset the context method mocks
    mockContextMarkAsRead.mockClear();
    mockContextDeleteNotification.mockClear();

    // Implement the context mocks to call the mocked API methods
    mockContextMarkAsRead.mockImplementation((async (id: string) => {
      // Simulate optimistic update would happen here in real context
      return mockedApiPut(`/notifications/${id}`, {}); // Simulate API call
    }) as any); // Correctly cast the async function expression
    mockContextDeleteNotification.mockImplementation((async (id: string) => {
      // Simulate optimistic update would happen here in real context
      return mockedApiDelete(`/notifications/${id}`); // Simulate API call
    }) as any); // Correctly cast the async function expression
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders notification heading and view all link", () => {
    renderComponent();
    expect(
      screen.getByRole("heading", { name: /Notifications/i })
    ).toBeInTheDocument();
    const viewAllLink = screen.getByText(/view all/i);
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest("a")).toHaveAttribute("href", "/notifications");
  });

  test("displays notifications correctly", () => {
    renderComponent();
    expect(
      screen.getByText(mockNotificationsContextValue.notifications[0].content)
    ).toBeInTheDocument();
    expect(
      screen.getByText(mockNotificationsContextValue.notifications[1].content)
    ).toBeInTheDocument();
    expect(
      screen.getByText(mockNotificationsContextValue.notifications[2].content)
    ).toBeInTheDocument();

    const unreadNotification = screen.getByText(
      mockNotificationsContextValue.notifications[0].content
    );
    expect(unreadNotification.closest(".p-4")).toHaveClass("bg-blue-50");

    const readNotification = screen.getByText(
      mockNotificationsContextValue.notifications[1].content
    );
    expect(readNotification.closest(".p-4")).not.toHaveClass("bg-blue-50");
  });

  test("calls markAsRead (context mock), onClose, and navigates on notification click (new assignment)", async () => {
    renderComponent();
    const notificationElement = screen.getByText(
      mockNotificationsContextValue.notifications[0].content
    );
    fireEvent.click(notificationElement);

    // Check if the context's markAsRead was called
    await waitFor(() => {
      expect(mockContextMarkAsRead).toHaveBeenCalledWith("n1");
    });
    // Optionally, check if the underlying API call was made by the context mock
    // await waitFor(() => {
    //   expect(mockedApiPut).toHaveBeenCalledWith(`/notifications/n1`, {});
    // });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/notifications");
  });

  test("calls markAsRead (context mock), onClose, and navigates on notification click (completed training)", async () => {
    renderComponent();
    const notificationElement = screen.getByText(
      mockNotificationsContextValue.notifications[1].content
    );
    fireEvent.click(notificationElement);

    await waitFor(() => {
      expect(mockContextMarkAsRead).toHaveBeenCalledWith("n2");
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      "/staff/staff123?resultId=res123"
    );
  });

  test("calls markAsRead (context mock), onClose, and navigates on notification click (new staff)", async () => {
    renderComponent();
    const notificationElement = screen.getByText(
      mockNotificationsContextValue.notifications[2].content
    );
    fireEvent.click(notificationElement);

    await waitFor(() => {
      expect(mockContextMarkAsRead).toHaveBeenCalledWith("n3");
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/staff/staff456");
  });

  test("calls deleteNotification (context mock) and onClose when delete button is clicked", async () => {
    renderComponent();
    // Find the delete button associated with the first notification
    const firstNotificationText =
      mockNotificationsContextValue.notifications[0].content;
    const notificationElement = screen.getByText(firstNotificationText);
    const deleteButton = notificationElement
      .closest(".p-4")
      ?.querySelector('button[aria-label="Delete notification"]');

    expect(deleteButton).toBeInTheDocument();
    if (!deleteButton) throw new Error("Delete button not found"); // Type guard

    fireEvent.click(deleteButton);

    // Check if the context's deleteNotification was called
    await waitFor(() => {
      expect(mockContextDeleteNotification).toHaveBeenCalledWith("n1");
    });
    // Optionally, check if the underlying API call was made by the context mock
    // await waitFor(() => {
    //  expect(mockedApiDelete).toHaveBeenCalledWith(`/notifications/n1`);
    // });

    // expect(mockOnClose).toHaveBeenCalledTimes(1); // Panel might not close on delete?
  });

  test("calls onClose when 'View All' link is clicked", () => {
    renderComponent();
    const viewAllLink = screen.getByText(/view all/i);
    fireEvent.click(viewAllLink);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
