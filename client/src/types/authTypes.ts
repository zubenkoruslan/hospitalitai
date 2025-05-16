import { ClientUserMinimal, UserRole } from "./user";
// Potentially import a Restaurant type if defined, e.g.:
// import { IRestaurant } from './restaurantTypes';

export interface AuthResponse {
  token: string;
  user: ClientUserMinimal;
  restaurantName?: string; // Changed from restaurant?: any to match backend response
}

export interface LoginCredentials {
  email: string;
  password?: string; // Password might be optional for OAuth later or social logins
}

export interface SignupDataClient {
  email: string;
  password?: string;
  role: UserRole; // From user.ts
  name: string;
  restaurantName?: string; // For new restaurant owner signup
  restaurantId?: string; // For staff signup to existing restaurant
  professionalRole?: string; // For staff
}
