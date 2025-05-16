import { IRole } from "./roleTypes";

// Defines user-related types

export enum UserRole {
  RestaurantOwner = "restaurant",
  Staff = "staff",
}

// You can add other user-related types here later, e.g.:
// export interface UserProfile { ... }

// From api.ts: ClientUserMinimal
export interface ClientUserMinimal {
  _id: string;
  name?: string;
  email?: string;
  professionalRole?: string;
  role?: UserRole;
  restaurantId?: string;
  assignedRoleId?: string;
}
