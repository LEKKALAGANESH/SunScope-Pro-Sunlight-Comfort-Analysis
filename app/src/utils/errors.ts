/**
 * Error Handling Utilities for SunScope Pro
 *
 * Provides typed errors, error messages, and handling utilities
 * for user-friendly error display throughout the application.
 */

// Error type constants (using const object instead of enum for erasableSyntaxOnly compatibility)
export const ErrorType = {
  // Image-related errors
  IMAGE_LOAD_FAILED: 'IMAGE_LOAD_FAILED',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  IMAGE_INVALID_FORMAT: 'IMAGE_INVALID_FORMAT',
  IMAGE_CORRUPT: 'IMAGE_CORRUPT',

  // Analysis errors
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  ANALYSIS_NO_BUILDINGS: 'ANALYSIS_NO_BUILDINGS',
  ANALYSIS_INVALID_LOCATION: 'ANALYSIS_INVALID_LOCATION',

  // Export errors
  EXPORT_FAILED: 'EXPORT_FAILED',
  EXPORT_PDF_FAILED: 'EXPORT_PDF_FAILED',
  EXPORT_PNG_FAILED: 'EXPORT_PNG_FAILED',
  EXPORT_GLTF_FAILED: 'EXPORT_GLTF_FAILED',
  EXPORT_NO_SNAPSHOT: 'EXPORT_NO_SNAPSHOT',

  // Input validation errors
  INVALID_LATITUDE: 'INVALID_LATITUDE',
  INVALID_LONGITUDE: 'INVALID_LONGITUDE',
  INVALID_FLOOR_COUNT: 'INVALID_FLOOR_COUNT',
  INVALID_FLOOR_HEIGHT: 'INVALID_FLOOR_HEIGHT',
  INVALID_SCALE: 'INVALID_SCALE',
  INVALID_NORTH_ANGLE: 'INVALID_NORTH_ANGLE',

  // 3D/WebGL errors
  WEBGL_NOT_SUPPORTED: 'WEBGL_NOT_SUPPORTED',
  SCENE_INIT_FAILED: 'SCENE_INIT_FAILED',

  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

// Error severity levels
export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type ErrorSeverity = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

// Application error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly recoveryAction?: string;
  public readonly timestamp: Date;

  constructor(
    type: ErrorType,
    userMessage: string,
    options?: {
      severity?: ErrorSeverity;
      recoveryAction?: string;
      originalError?: Error;
    }
  ) {
    super(userMessage);
    this.name = 'AppError';
    this.type = type;
    this.userMessage = userMessage;
    this.severity = options?.severity ?? ErrorSeverity.ERROR;
    this.recoveryAction = options?.recoveryAction;
    this.timestamp = new Date();

    // Preserve original stack trace if available
    if (options?.originalError?.stack) {
      this.stack = options.originalError.stack;
    }
  }
}

// Error messages mapping
export const ERROR_MESSAGES: Record<ErrorType, { message: string; recovery?: string }> = {
  // Image errors
  [ErrorType.IMAGE_LOAD_FAILED]: {
    message: 'Failed to load the image. The file may be corrupted or inaccessible.',
    recovery: 'Try uploading a different image file.',
  },
  [ErrorType.IMAGE_TOO_LARGE]: {
    message: 'Image file is too large. Maximum size is 10MB.',
    recovery: 'Compress the image or use a lower resolution version.',
  },
  [ErrorType.IMAGE_INVALID_FORMAT]: {
    message: 'Unsupported file format. Please use JPG, PNG, or PDF.',
    recovery: 'Convert your file to a supported format.',
  },
  [ErrorType.IMAGE_CORRUPT]: {
    message: 'The image file appears to be corrupted or unreadable.',
    recovery: 'Try a different image file.',
  },

  // Analysis errors
  [ErrorType.ANALYSIS_FAILED]: {
    message: 'Analysis could not be completed. Please try again.',
    recovery: 'Check your building configurations and try again.',
  },
  [ErrorType.ANALYSIS_NO_BUILDINGS]: {
    message: 'No buildings found to analyze. Please add at least one building.',
    recovery: 'Go back to the editor and draw building footprints.',
  },
  [ErrorType.ANALYSIS_INVALID_LOCATION]: {
    message: 'Invalid location coordinates. Sun calculations require valid latitude and longitude.',
    recovery: 'Go to Site Setup and enter valid coordinates.',
  },

  // Export errors
  [ErrorType.EXPORT_FAILED]: {
    message: 'Export failed. Please try again.',
    recovery: 'Check your browser settings and try again.',
  },
  [ErrorType.EXPORT_PDF_FAILED]: {
    message: 'PDF generation failed. The report could not be created.',
    recovery: 'Try exporting as CSV or JSON instead.',
  },
  [ErrorType.EXPORT_PNG_FAILED]: {
    message: 'Screenshot capture failed.',
    recovery: 'Try reducing the 3D view complexity.',
  },
  [ErrorType.EXPORT_GLTF_FAILED]: {
    message: '3D model export failed.',
    recovery: 'Try reducing the number of buildings.',
  },
  [ErrorType.EXPORT_NO_SNAPSHOT]: {
    message: 'No 3D view snapshot available for export.',
    recovery: 'Go to the 3D Viewer first, then return to export.',
  },

  // Validation errors
  [ErrorType.INVALID_LATITUDE]: {
    message: 'Latitude must be between -90 and 90 degrees.',
    recovery: 'Enter a valid latitude value.',
  },
  [ErrorType.INVALID_LONGITUDE]: {
    message: 'Longitude must be between -180 and 180 degrees.',
    recovery: 'Enter a valid longitude value.',
  },
  [ErrorType.INVALID_FLOOR_COUNT]: {
    message: 'Floor count must be between 1 and 100.',
    recovery: 'Enter a valid number of floors.',
  },
  [ErrorType.INVALID_FLOOR_HEIGHT]: {
    message: 'Floor height must be between 2m and 10m.',
    recovery: 'Enter a typical floor height (e.g., 3m).',
  },
  [ErrorType.INVALID_SCALE]: {
    message: 'Scale must be between 0.01 and 10 meters per pixel.',
    recovery: 'Adjust the scale reference line.',
  },
  [ErrorType.INVALID_NORTH_ANGLE]: {
    message: 'North angle must be between 0 and 360 degrees.',
    recovery: 'Adjust the compass orientation.',
  },

  // 3D errors
  [ErrorType.WEBGL_NOT_SUPPORTED]: {
    message: 'Your browser does not support 3D graphics (WebGL).',
    recovery: 'Try using Chrome, Firefox, or Edge browser.',
  },
  [ErrorType.SCENE_INIT_FAILED]: {
    message: '3D scene could not be initialized.',
    recovery: 'Refresh the page and try again.',
  },

  // General errors
  [ErrorType.UNKNOWN_ERROR]: {
    message: 'An unexpected error occurred.',
    recovery: 'Refresh the page and try again.',
  },
  [ErrorType.NETWORK_ERROR]: {
    message: 'Network connection issue.',
    recovery: 'Check your internet connection.',
  },
};

// Create an AppError from an ErrorType
export function createError(
  type: ErrorType,
  options?: {
    severity?: ErrorSeverity;
    customMessage?: string;
    originalError?: Error;
  }
): AppError {
  const errorInfo = ERROR_MESSAGES[type] || ERROR_MESSAGES[ErrorType.UNKNOWN_ERROR];

  return new AppError(type, options?.customMessage || errorInfo.message, {
    severity: options?.severity,
    recoveryAction: errorInfo.recovery,
    originalError: options?.originalError,
  });
}

// Validation utilities
export const validators = {
  latitude: (value: number): boolean => {
    return typeof value === 'number' && !isNaN(value) && value >= -90 && value <= 90;
  },

  longitude: (value: number): boolean => {
    return typeof value === 'number' && !isNaN(value) && value >= -180 && value <= 180;
  },

  floorCount: (value: number): boolean => {
    return Number.isInteger(value) && value >= 1 && value <= 100;
  },

  floorHeight: (value: number): boolean => {
    return typeof value === 'number' && !isNaN(value) && value >= 2 && value <= 10;
  },

  scale: (value: number): boolean => {
    return typeof value === 'number' && !isNaN(value) && value >= 0.01 && value <= 10;
  },

  northAngle: (value: number): boolean => {
    return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 360;
  },

  imageSize: (bytes: number): boolean => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return bytes <= maxSize;
  },

  imageFormat: (mimeType: string): boolean => {
    const supportedFormats = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    return supportedFormats.includes(mimeType.toLowerCase());
  },
};

// Validate and return error if invalid
export function validateInput(
  value: number,
  type: 'latitude' | 'longitude' | 'floorCount' | 'floorHeight' | 'scale' | 'northAngle'
): AppError | null {
  const validator = validators[type];
  if (!validator(value)) {
    const errorTypeMap: Record<string, ErrorType> = {
      latitude: ErrorType.INVALID_LATITUDE,
      longitude: ErrorType.INVALID_LONGITUDE,
      floorCount: ErrorType.INVALID_FLOOR_COUNT,
      floorHeight: ErrorType.INVALID_FLOOR_HEIGHT,
      scale: ErrorType.INVALID_SCALE,
      northAngle: ErrorType.INVALID_NORTH_ANGLE,
    };
    return createError(errorTypeMap[type], { severity: ErrorSeverity.WARNING });
  }
  return null;
}

// Error logging utility (for development and debugging)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function logError(_error: AppError | Error, _context?: string): void {
  // Logging disabled in production
}

// Type guard for AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Safe async wrapper with error handling
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorType: ErrorType,
  context?: string
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (err) {
    const appError = createError(errorType, {
      originalError: err instanceof Error ? err : new Error(String(err)),
    });
    logError(appError, context);
    return { success: false, error: appError };
  }
}
