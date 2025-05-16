import mongoose from "mongoose";

export interface AuthPayload {
  userId: mongoose.Types.ObjectId;
  role: string; // Or specific 'restaurant' | 'staff'
  name: string;
  restaurantId?: mongoose.Types.ObjectId;
  restaurantName?: string;
  professionalRole?: string;
}

export interface SignupData {
  email: string;
  password?: string;
  role: "restaurant" | "staff";
  name: string;
  restaurantName?: string;
  restaurantId?: string; // For staff role
  professionalRole?: string; // For staff role
}
