import mongoose from "mongoose";

export interface AuthPayload {
  userId: mongoose.Types.ObjectId;
  role: string; // Or specific 'restaurant' | 'staff'
  name: string;
  restaurantId?: mongoose.Types.ObjectId;
  restaurantName?: string;
  iat?: number;
  exp?: number;
}

export interface SignupData {
  email: string;
  password?: string;
  role: "restaurant" | "staff";
  name: string;
  restaurantName?: string;
  restaurantId?: string; // For staff role
  assignedRoleId?: string; // Optional: For assigning a specific role on signup
}

// Added for profile updates
export interface UserProfileUpdateData {
  name?: string;
  email?: string;
  restaurantName?: string; // For restaurant owners updating their linked restaurant's name (if handled here)
  // Add other updatable fields as necessary
}

// Represents the user object returned by API (excluding sensitive fields like password)
export interface UserAPIResponse {
  _id: string;
  name: string;
  email: string;
  role: string;
  restaurantId?: string;
  restaurantName?: string;
  assignedRoleId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // Add any other fields that are safe and useful to return
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string; // For validation on the frontend, backend primarily uses newPassword
}
