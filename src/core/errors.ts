/**
 * Base error class for StructPDF operations
 */
export class StructPDFError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'StructPDFError';
    
    // Preserve stack trace
    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Error thrown during injection operations
 */
export class InjectionError extends StructPDFError {
  constructor(message: string, cause?: Error) {
    super(`Injection failed: ${message}`, cause);
    this.name = 'InjectionError';
  }
}

/**
 * Error thrown during extraction operations
 */
export class ExtractionError extends StructPDFError {
  constructor(message: string, cause?: Error) {
    super(`Extraction failed: ${message}`, cause);
    this.name = 'ExtractionError';
  }
}

/**
 * Error thrown for validation issues
 */
export class ValidationError extends StructPDFError {
  constructor(message: string, cause?: Error) {
    super(`Validation failed: ${message}`, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown for file system operations
 */
export class FileSystemError extends StructPDFError {
  constructor(message: string, cause?: Error) {
    super(`File system error: ${message}`, cause);
    this.name = 'FileSystemError';
  }
} 