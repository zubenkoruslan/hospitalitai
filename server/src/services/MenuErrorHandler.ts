import { AppError } from "../utils/errorHandler";

/**
 * Specialized error types for menu operations
 */
export class MenuServiceError extends AppError {
  public readonly code: string;
  public readonly context?: any;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: any
  ) {
    super(message, statusCode, context);
    this.code = code;
    this.context = context;
    this.name = "MenuServiceError";
  }
}

export class MenuValidationError extends MenuServiceError {
  constructor(message: string, context?: any) {
    super(message, "MENU_VALIDATION_ERROR", 400, context);
    this.name = "MenuValidationError";
  }
}

export class MenuNotFoundError extends MenuServiceError {
  constructor(menuId: string, restaurantId?: string) {
    super(
      `Menu not found or does not belong to restaurant`,
      "MENU_NOT_FOUND",
      404,
      { menuId, restaurantId }
    );
    this.name = "MenuNotFoundError";
  }
}

export class MenuConflictError extends MenuServiceError {
  constructor(message: string, context?: any) {
    super(message, "MENU_CONFLICT", 409, context);
    this.name = "MenuConflictError";
  }
}

export class AIProcessingError extends MenuServiceError {
  constructor(message: string, context?: any) {
    super(message, "AI_PROCESSING_FAILED", 500, context);
    this.name = "AIProcessingError";
  }
}

export class FileProcessingError extends MenuServiceError {
  constructor(message: string, context?: any) {
    super(message, "FILE_PROCESSING_FAILED", 400, context);
    this.name = "FileProcessingError";
  }
}

export class ImportError extends MenuServiceError {
  constructor(message: string, context?: any) {
    super(message, "IMPORT_FAILED", 500, context);
    this.name = "ImportError";
  }
}

/**
 * Error context builders for consistent error reporting
 */
export class ErrorContextBuilder {
  private context: any = {};

  static create(): ErrorContextBuilder {
    return new ErrorContextBuilder();
  }

  withMenuId(menuId: string): ErrorContextBuilder {
    this.context.menuId = menuId;
    return this;
  }

  withRestaurantId(restaurantId: string): ErrorContextBuilder {
    this.context.restaurantId = restaurantId;
    return this;
  }

  withFileName(fileName: string): ErrorContextBuilder {
    this.context.fileName = fileName;
    return this;
  }

  withFileSize(sizeBytes: number): ErrorContextBuilder {
    this.context.fileSizeBytes = sizeBytes;
    this.context.fileSizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    return this;
  }

  withProcessingTime(timeMs: number): ErrorContextBuilder {
    this.context.processingTimeMs = timeMs;
    return this;
  }

  withItemCount(count: number): ErrorContextBuilder {
    this.context.itemCount = count;
    return this;
  }

  withAIModel(model: string): ErrorContextBuilder {
    this.context.aiModel = model;
    return this;
  }

  withAttempts(attempts: number): ErrorContextBuilder {
    this.context.attempts = attempts;
    return this;
  }

  withOriginalError(error: Error): ErrorContextBuilder {
    this.context.originalError = {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"), // First 5 lines only
    };
    return this;
  }

  withUserAction(action: string): ErrorContextBuilder {
    this.context.userAction = action;
    return this;
  }

  withValidationDetails(
    field: string,
    value: any,
    constraint: string
  ): ErrorContextBuilder {
    if (!this.context.validationErrors) {
      this.context.validationErrors = [];
    }
    this.context.validationErrors.push({ field, value, constraint });
    return this;
  }

  build(): any {
    return { ...this.context };
  }
}

/**
 * Centralized error handling and logging for menu operations
 */
export class MenuErrorHandler {
  /**
   * Handle file processing errors
   */
  static handleFileError(
    error: any,
    fileName?: string,
    fileSize?: number
  ): FileProcessingError {
    const context = ErrorContextBuilder.create()
      .withFileName(fileName || "unknown")
      .withFileSize(fileSize || 0)
      .withOriginalError(error)
      .build();

    if (error.message?.includes("ENOENT")) {
      return new FileProcessingError(
        "File not found or was removed during processing",
        context
      );
    }

    if (
      error.message?.includes("EMFILE") ||
      error.message?.includes("ENFILE")
    ) {
      return new FileProcessingError(
        "Too many open files - system resource limit reached",
        context
      );
    }

    if (error.message?.includes("EACCES")) {
      return new FileProcessingError(
        "Permission denied accessing the file",
        context
      );
    }

    if (error.message?.includes("pdf-parse")) {
      return new FileProcessingError(
        "Failed to parse PDF - file may be corrupted or password protected",
        context
      );
    }

    return new FileProcessingError(
      `File processing failed: ${error.message || "Unknown file error"}`,
      context
    );
  }

  /**
   * Handle AI processing errors
   */
  static handleAIError(
    error: any,
    model: string,
    attempts: number,
    processingTime: number,
    textLength: number
  ): AIProcessingError {
    const context = ErrorContextBuilder.create()
      .withAIModel(model)
      .withAttempts(attempts)
      .withProcessingTime(processingTime)
      .withOriginalError(error)
      .build();

    context.textLength = textLength;

    if (
      error.message?.includes("400") ||
      error.message?.includes("Bad Request")
    ) {
      return new AIProcessingError(
        "AI service rejected the request - input may be invalid or too large",
        context
      );
    }

    if (
      error.message?.includes("401") ||
      error.message?.includes("unauthorized")
    ) {
      return new AIProcessingError(
        "AI service authentication failed - check API key",
        context
      );
    }

    if (
      error.message?.includes("429") ||
      error.message?.includes("rate limit")
    ) {
      return new AIProcessingError(
        "AI service rate limit exceeded - please try again later",
        context
      );
    }

    if (error.message?.includes("timeout")) {
      return new AIProcessingError(
        "AI processing timed out - file may be too complex",
        context
      );
    }

    if (error.message?.includes("Function call not received")) {
      return new AIProcessingError(
        "AI failed to use required function format - model may be incompatible",
        context
      );
    }

    return new AIProcessingError(
      `AI processing failed after ${attempts} attempts: ${
        error.message || "Unknown AI error"
      }`,
      context
    );
  }

  /**
   * Handle menu validation errors
   */
  static handleValidationError(
    field: string,
    value: any,
    constraint: string
  ): MenuValidationError {
    const context = ErrorContextBuilder.create()
      .withValidationDetails(field, value, constraint)
      .build();

    const messages: Record<string, string> = {
      "name.required": "Menu name is required",
      "name.length": `Menu name exceeds maximum length of ${constraint} characters`,
      "name.duplicate": `A menu with the name "${value}" already exists`,
      "price.negative": "Price cannot be negative",
      "price.invalid": "Price must be a valid number",
      "ingredients.count": `Number of ingredients exceeds maximum of ${constraint}`,
      "category.empty": "Category cannot be empty",
      "itemType.invalid": `Item type must be one of: ${constraint}`,
    };

    const key = `${field}.${constraint.split(" ")[0]}`;
    const message = messages[key] || `Invalid ${field}: ${constraint}`;

    return new MenuValidationError(message, context);
  }

  /**
   * Handle import errors
   */
  static handleImportError(
    error: any,
    itemsProcessed: number,
    operationType: "create" | "update" | "delete"
  ): ImportError {
    const context = ErrorContextBuilder.create()
      .withItemCount(itemsProcessed)
      .withUserAction(operationType)
      .withOriginalError(error)
      .build();

    if (error.message?.includes("duplicate key")) {
      return new ImportError("Import failed due to duplicate items", context);
    }

    if (error.message?.includes("validation")) {
      return new ImportError(
        "Import failed due to data validation errors",
        context
      );
    }

    if (error.message?.includes("transaction")) {
      return new ImportError(
        "Import failed due to database transaction error",
        context
      );
    }

    return new ImportError(
      `Import failed during ${operationType} operation: ${
        error.message || "Unknown import error"
      }`,
      context
    );
  }

  /**
   * Create user-friendly error messages
   */
  static createUserFriendlyMessage(error: MenuServiceError): string {
    const codeMessages: Record<string, string> = {
      MENU_NOT_FOUND:
        "The requested menu could not be found. It may have been deleted or you may not have permission to access it.",
      MENU_VALIDATION_ERROR:
        "The menu data is invalid. Please check your input and try again.",
      MENU_CONFLICT:
        "This operation conflicts with existing data. Please resolve conflicts and try again.",
      AI_PROCESSING_FAILED:
        "The AI service encountered an error while processing your menu. Please try uploading a different file or contact support.",
      FILE_PROCESSING_FAILED:
        "The uploaded file could not be processed. Please ensure it's a valid PDF, Excel, CSV, or Word document.",
      IMPORT_FAILED:
        "The menu import operation failed. Some items may have been imported successfully.",
    };

    return codeMessages[error.code] || error.message;
  }

  /**
   * Log error with structured information
   */
  static logError(error: MenuServiceError, operation: string): void {
    const logData = {
      timestamp: new Date().toISOString(),
      operation,
      errorCode: error.code,
      errorMessage: error.message,
      statusCode: error.statusCode,
      context: error.context,
      userFriendlyMessage: this.createUserFriendlyMessage(error),
    };

    console.error(
      `[MenuErrorHandler] ${operation} failed:`,
      JSON.stringify(logData, null, 2)
    );
  }

  /**
   * Extract safe error details for API responses
   */
  static extractApiErrorDetails(error: MenuServiceError): {
    code: string;
    message: string;
    userMessage: string;
    statusCode: number;
    context?: any;
  } {
    // Remove sensitive information from context
    const safeContext = error.context
      ? {
          ...error.context,
          // Remove potentially sensitive fields
          originalError: error.context.originalError
            ? {
                name: error.context.originalError.name,
                message: error.context.originalError.message,
                // Don't include stack trace in API response
              }
            : undefined,
        }
      : undefined;

    return {
      code: error.code,
      message: error.message,
      userMessage: this.createUserFriendlyMessage(error),
      statusCode: error.statusCode,
      context: safeContext,
    };
  }

  /**
   * Create comprehensive error report for debugging
   */
  static createErrorReport(
    error: MenuServiceError,
    additionalInfo?: any
  ): string {
    const report = [
      `Error Report - ${new Date().toISOString()}`,
      `================================`,
      `Error Code: ${error.code}`,
      `Error Type: ${error.name}`,
      `Message: ${error.message}`,
      `Status Code: ${error.statusCode}`,
      ``,
      `Context:`,
      JSON.stringify(error.context || {}, null, 2),
      ``,
      `Additional Info:`,
      JSON.stringify(additionalInfo || {}, null, 2),
      ``,
      `Stack Trace:`,
      error.stack || "No stack trace available",
    ];

    return report.join("\n");
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecoveryStrategies {
  /**
   * Suggest recovery actions for different error types
   */
  static suggestRecovery(error: MenuServiceError): string[] {
    const suggestions: Record<string, string[]> = {
      FILE_PROCESSING_FAILED: [
        "Try re-uploading the file",
        "Ensure the file is not corrupted",
        "Check file size (must be under 10MB)",
        "Convert to a different supported format (PDF, Excel, CSV)",
      ],
      AI_PROCESSING_FAILED: [
        "Try uploading a clearer version of the menu",
        "Reduce file complexity (fewer items per page)",
        "Ensure text is clearly readable",
        "Contact support if the issue persists",
      ],
      MENU_VALIDATION_ERROR: [
        "Check all required fields are filled",
        "Verify price values are valid numbers",
        "Ensure menu name is unique",
        "Review item categories and types",
      ],
      IMPORT_FAILED: [
        "Resolve any data conflicts",
        "Check item naming conventions",
        "Verify restaurant permissions",
        "Try importing smaller batches",
      ],
      MENU_NOT_FOUND: [
        "Verify the menu exists",
        "Check you have permission to access this menu",
        "Refresh the page and try again",
        "Contact support if the menu should exist",
      ],
    };

    return suggestions[error.code] || ["Contact support for assistance"];
  }

  /**
   * Determine if error is retryable
   */
  static isRetryable(error: MenuServiceError): boolean {
    const retryableCodes = [
      "AI_PROCESSING_FAILED", // May succeed on retry with different prompt
      "IMPORT_FAILED", // Transaction may succeed on retry
    ];

    const nonRetryableCodes = [
      "MENU_VALIDATION_ERROR", // Data needs to be fixed first
      "FILE_PROCESSING_FAILED", // File issues unlikely to resolve automatically
      "MENU_NOT_FOUND", // Won't change without user action
      "MENU_CONFLICT", // Needs conflict resolution
    ];

    if (nonRetryableCodes.includes(error.code)) {
      return false;
    }

    if (retryableCodes.includes(error.code)) {
      return true;
    }

    // Default: check if it's a server error (5xx)
    return error.statusCode >= 500;
  }

  /**
   * Calculate retry delay based on attempt number
   */
  static calculateRetryDelay(
    attempt: number,
    baseDelay: number = 1000
  ): number {
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
  }
}
