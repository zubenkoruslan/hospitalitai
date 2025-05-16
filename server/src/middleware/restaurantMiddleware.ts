import { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure that the authenticated user is associated with a restaurant.
 * Attaches restaurantId to the request if found.
 * Should be used after the 'protect' middleware.
 */
export const ensureRestaurantAssociation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.restaurantId) {
    // Use status code 403 Forbidden as the user is authenticated but lacks association
    res.status(403).json({
      message: "Access denied. User is not associated with a restaurant.",
    });
    return;
  }
  next();
};
