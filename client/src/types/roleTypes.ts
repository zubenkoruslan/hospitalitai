export interface IRole {
  _id: string; // Changed from id to _id for MongoDB consistency
  name: string;
  description?: string;
  restaurantId: string;
  createdAt?: string; // Optional: if you plan to use these on the frontend
  updatedAt?: string; // Optional: if you plan to use these on the frontend
}
