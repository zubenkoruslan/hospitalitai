import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import MenuService from "../services/menuService";
import { AppError } from "../utils/errorHandler";
import { IMenu } from "../models/Menu"; // Assuming IMenu is exported from Menu model

// No need for AuthenticatedRequest if AuthPayload is globally declared via authMiddleware.ts

export const uploadMenuPdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("[menuController] Entered uploadMenuPdf");
  try {
    const restaurantIdString = req.params.restaurantId;
    console.log(
      "[menuController] Restaurant ID string from params:",
      restaurantIdString
    );

    if (!mongoose.Types.ObjectId.isValid(restaurantIdString)) {
      console.error(
        "[menuController] Invalid restaurant ID format:",
        restaurantIdString
      );
      return next(new AppError("Invalid restaurant ID format", 400));
    }
    const restaurantId = new mongoose.Types.ObjectId(restaurantIdString);
    console.log(
      "[menuController] Parsed restaurant ID:",
      restaurantId.toHexString()
    );

    // Ensure the logged-in user is authorized to upload for this restaurant
    // This logic depends on your auth setup (e.g., req.user.restaurantId === restaurantId)
    // Or if req.user.role === 'restaurant' and req.user._id corresponds to an owner of this restaurantId
    // For simplicity, this example assumes restaurantId comes from params and ownership is verified by `restrictTo` or similar.

    if (!req.file) {
      console.error(
        "[menuController] No req.file found. Multer did not process a file."
      );
      return next(new AppError("No PDF file uploaded.", 400));
    }

    console.log(
      "[menuController] req.file object from multer:",
      JSON.stringify(req.file, null, 2)
    );

    const filePath = req.file.path;
    console.log("[menuController] File path from req.file.path:", filePath);

    // It's important to pass the correct restaurantId.
    // req.user should be available here if 'protect' middleware ran successfully.
    // Ensure your AuthPayload has restaurantId for restaurant users.
    // If not, you might need to fetch it based on req.user.userId if the user is a restaurant owner.

    // For this example, we'll assume restaurantId from params is authoritative AFTER 'restrictTo' has validated access.
    console.log("[menuController] Calling MenuService.processPdfMenuUpload...");
    const menu = await MenuService.processPdfMenuUpload(
      filePath,
      restaurantId,
      req.file.originalname
    );
    console.log("[menuController] MenuService.processPdfMenuUpload completed.");

    res.status(201).json({
      message: "Menu PDF uploaded and processed successfully.",
      data: menu,
    });
  } catch (error) {
    console.error(
      "[menuController] Error in uploadMenuPdf catch block:",
      error
    );
    // If the file was uploaded and an error occurred during processing,
    // you might want to delete the uploaded file from the /uploads directory.
    // import fs from 'fs';
    // if (req.file) fs.unlinkSync(req.file.path);
    next(error);
  }
};

// Placeholder for other menu controller functions if this is a new file
// export const createMenu = async (req: Request, res: Response, next: NextFunction) => { ... };
// export const getMenu = async (req: Request, res: Response, next: NextFunction) => { ... };
