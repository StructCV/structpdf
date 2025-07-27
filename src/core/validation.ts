import * as path from 'path';
import * as fs from 'fs/promises';
import { JSONValue } from '../types';

/**
 * Validates file paths for security and existence
 */
export class PathValidator {
  /**
   * Validates a file path for security (prevents path traversal)
   */
  static validatePath(filePath: string): string {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid path: path must be a non-empty string');
    }

    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(normalizedPath);
    
    // Check for path traversal attempts
    if (normalizedPath.includes('..')) {
      throw new Error(`Invalid path: ${filePath} - Path traversal detected`);
    }
    
    // Check for double slashes (but allow Windows drive letters like C://)
    if (normalizedPath.includes('//') && !normalizedPath.match(/^[A-Za-z]:\/\//)) {
      throw new Error(`Invalid path: ${filePath} - Invalid path format`);
    }
    
    // More permissive check for absolute paths - allow if it's a reasonable absolute path
    if (path.isAbsolute(filePath)) {
      const cwd = process.cwd();
      const relativeToCwd = path.relative(cwd, resolvedPath);
      
      // Only reject if it's trying to access system directories
      const dangerousPaths = ['/etc', '/sys', '/proc', '/dev', 'C:\\Windows', 'C:\\System32'];
      const isDangerous = dangerousPaths.some(dangerous => 
        resolvedPath.toLowerCase().startsWith(dangerous.toLowerCase())
      );
      
      if (isDangerous) {
        throw new Error(`Invalid path: ${filePath} - Access to system directories not allowed`);
      }
    }
    
    return resolvedPath;
  }

  /**
   * Validates that a file exists and is readable
   */
  static async validateFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`File not found or not readable: ${filePath}`);
    }
  }

  /**
   * Validates that a directory is writable
   */
  static async validateDirectoryWritable(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath, fs.constants.W_OK);
    } catch (error) {
      throw new Error(`Directory not writable: ${dirPath}`);
    }
  }

  /**
   * Validates output path and ensures directory exists
   */
  static async validateOutputPath(outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    
    try {
      await fs.access(dir, fs.constants.W_OK);
    } catch {
      // Try to create directory if it doesn't exist
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        throw new Error(`Cannot create output directory: ${dir}`);
      }
    }
  }
}

/**
 * Validates URLs for schema references
 */
export class URLValidator {
  /**
   * Validates if a string is a valid URL
   */
  static validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates schema URL and returns warning if suspicious
   */
  static validateSchemaURL(schemaUrl: string): { valid: boolean; warning?: string } {
    if (!this.validateURL(schemaUrl)) {
      return { valid: false };
    }

    // Check for suspicious patterns
    if (schemaUrl.includes('localhost') || schemaUrl.includes('127.0.0.1')) {
      return { 
        valid: true, 
        warning: 'Schema URL points to localhost - may not be accessible in production' 
      };
    }

    if (!schemaUrl.startsWith('https://')) {
      return { 
        valid: true, 
        warning: 'Schema URL is not using HTTPS - consider using a secure connection' 
      };
    }

    return { valid: true };
  }
}

/**
 * Validates JSON data
 */
export class JSONValidator {
  /**
   * Validates if data is valid JSON
   */
  static validateJSON(data: unknown): data is JSONValue {
    if (data === null) return true;
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') return true;
    
    if (Array.isArray(data)) {
      return data.every(item => this.validateJSON(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      // Reject instances of classes (like Date, RegExp, etc.)
      if (data.constructor !== Object && data.constructor !== undefined) {
        return false;
      }
      return Object.values(data).every(value => this.validateJSON(value));
    }
    
    return false;
  }
} 