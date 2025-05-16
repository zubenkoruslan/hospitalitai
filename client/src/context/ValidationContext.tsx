import React, { createContext, ReactNode, useContext } from "react";

// Validation helper types
export interface ValidationFunctions {
  isValidName: (name: string) => { valid: boolean; message?: string };
  isValidPrice: (price: string) => { valid: boolean; message?: string };
  isValidDescription: (desc: string) => { valid: boolean; message?: string };
  isValidIngredient: (ingredient: string) => {
    valid: boolean;
    message?: string;
  };
  isValidEmail: (email: string) => { valid: boolean; message?: string };
  formatErrorMessage: (err: any) => string;
}

// Create the context
export const ValidationContext = createContext<ValidationFunctions | undefined>(
  undefined
);

// Provider component
export const ValidationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Name validation (for menus, items, etc.)
  const isValidName = (name: string) => {
    const trimmed = name.trim();

    if (!trimmed) {
      return { valid: false, message: "Name is required." };
    }

    if (trimmed.length < 2) {
      return { valid: false, message: "Name must be at least 2 characters." };
    }

    if (trimmed.length > 50) {
      return { valid: false, message: "Name cannot exceed 50 characters." };
    }

    return { valid: true };
  };

  // Price validation
  const isValidPrice = (price: string) => {
    if (!price.trim()) {
      return { valid: true }; // Optional field
    }

    const priceValue = parseFloat(price);

    if (isNaN(priceValue)) {
      return { valid: false, message: "Price must be a valid number." };
    }

    if (priceValue < 0) {
      return { valid: false, message: "Price cannot be negative." };
    }

    if (priceValue > 1000) {
      return {
        valid: false,
        message: "Price exceeds maximum allowed value (1000).",
      };
    }

    return { valid: true };
  };

  // Description validation
  const isValidDescription = (desc: string) => {
    if (!desc.trim()) {
      return { valid: true }; // Optional field
    }

    if (desc.trim().length > 500) {
      return {
        valid: false,
        message: "Description cannot exceed 500 characters.",
      };
    }

    return { valid: true };
  };

  // Ingredient validation
  const isValidIngredient = (ingredient: string) => {
    if (!ingredient.trim()) {
      return { valid: true }; // Empty is valid (filtered out later)
    }

    if (ingredient.trim().length > 50) {
      return {
        valid: false,
        message: "Ingredient name cannot exceed 50 characters.",
      };
    }

    return { valid: true };
  };

  // Email validation
  const isValidEmail = (email: string) => {
    if (!email.trim()) {
      return { valid: false, message: "Email is required." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: "Please enter a valid email address." };
    }

    return { valid: true };
  };

  // Format API error message
  const formatErrorMessage = (err: any): string => {
    if (err.response?.data?.message) {
      return err.response.data.message;
    }

    if (err.response?.data?.errors) {
      const errorMessages = Object.values(err.response.data.errors).join(", ");
      return errorMessages || "Validation failed.";
    }

    if (err.message) {
      return err.message;
    }

    return "An error occurred. Please try again.";
  };

  // Value object with all validation functions
  const validationFunctions: ValidationFunctions = {
    isValidName,
    isValidPrice,
    isValidDescription,
    isValidIngredient,
    isValidEmail,
    formatErrorMessage,
  };

  return (
    <ValidationContext.Provider value={validationFunctions}>
      {children}
    </ValidationContext.Provider>
  );
};

// Custom hook to use the validation context
export const useValidation = (): ValidationFunctions => {
  const context = useContext(ValidationContext);

  if (context === undefined) {
    throw new Error("useValidation must be used within a ValidationProvider");
  }

  return context;
};
