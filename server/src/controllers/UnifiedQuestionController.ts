import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AppError } from "../utils/errorHandler";
import { SimpleAiQuestionService } from "../services/SimpleAiQuestionService";
import { generateAiQuestionsService } from "../services/questionService";
import { ParallelQuestionService } from "../services/ParallelQuestionService";

/**
 * 🚀 UNIFIED QUESTION GENERATION CONTROLLER
 * 
 * SOLVES: "Too Many Services" Problem
 * 
 * Before: 4 different services to choose from
 * After: ONE entry point for all question generation
 */

export class UnifiedQuestionController {
  
  /**
   * 🎯 MAIN ENTRY POINT - ONE method for ALL question generation
   */
  static async generateQuestions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      console.log("🚀 [UnifiedGen] Processing generation request");
      
      // Check if parallel processing is requested
      const useParallel = req.body.enableParallelProcessing !== false;
      
      // For now, route everything to the existing working service
      const questions = await generateAiQuestionsService({
        restaurantId: new Types.ObjectId(req.user?.restaurantId),
        menuId: req.body.menuId,
        bankId: req.body.bankId,
        itemIds: req.body.itemIds,
        categoriesToFocus: req.body.categoriesToFocus || [],
        numQuestionsPerItem: req.body.numQuestionsPerItem || 2
      });
      
      res.status(200).json({
        status: "success",
        message: `Generated ${questions.length} questions successfully`,
        data: {
          questions,
          generated: questions.length,
          service: "UnifiedQuestionController"
        }
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * 📋 LEGACY COMPATIBILITY - Existing menu endpoint
   */
  static async generateMenuQuestions(req: Request, res: Response, next: NextFunction) {
    console.log("📋 [UnifiedGen] Routing menu request to unified handler");
    await this.generateQuestions(req, res, next);
  }
}

export default UnifiedQuestionController;
