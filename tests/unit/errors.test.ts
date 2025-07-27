import { 
  StructPDFError, 
  InjectionError, 
  ExtractionError, 
  ValidationError, 
  FileSystemError 
} from '../../src/core/errors';

describe('Error Classes', () => {
  describe('StructPDFError', () => {
    it('should create basic error', () => {
      const error = new StructPDFError('Test message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StructPDFError);
      expect(error.name).toBe('StructPDFError');
      expect(error.message).toBe('Test message');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with cause', () => {
      const originalError = new Error('Original error');
      const error = new StructPDFError('Wrapper message', originalError);
      
      expect(error.message).toBe('Wrapper message');
      expect(error.cause).toBe(originalError);
      expect(error.stack).toContain('Caused by:');
    });

    it('should preserve stack trace', () => {
      const originalError = new Error('Original error');
      originalError.stack = 'Original stack trace';
      
      const error = new StructPDFError('Wrapper message', originalError);
      
      expect(error.stack).toContain('Wrapper message');
      expect(error.stack).toContain('Caused by: Original stack trace');
    });
  });

  describe('InjectionError', () => {
    it('should create injection error', () => {
      const error = new InjectionError('Failed to inject');
      
      expect(error).toBeInstanceOf(StructPDFError);
      expect(error).toBeInstanceOf(InjectionError);
      expect(error.name).toBe('InjectionError');
      expect(error.message).toBe('Injection failed: Failed to inject');
    });

    it('should create injection error with cause', () => {
      const cause = new Error('PDF is corrupted');
      const error = new InjectionError('Could not process PDF', cause);
      
      expect(error.message).toBe('Injection failed: Could not process PDF');
      expect(error.cause).toBe(cause);
    });
  });

  describe('ExtractionError', () => {
    it('should create extraction error', () => {
      const error = new ExtractionError('Failed to extract');
      
      expect(error).toBeInstanceOf(StructPDFError);
      expect(error).toBeInstanceOf(ExtractionError);
      expect(error.name).toBe('ExtractionError');
      expect(error.message).toBe('Extraction failed: Failed to extract');
    });

    it('should create extraction error with cause', () => {
      const cause = new Error('Decompression failed');
      const error = new ExtractionError('Invalid compressed data', cause);
      
      expect(error.message).toBe('Extraction failed: Invalid compressed data');
      expect(error.cause).toBe(cause);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(StructPDFError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed: Invalid input');
    });

    it('should create validation error with cause', () => {
      const cause = new Error('Schema validation failed');
      const error = new ValidationError('JSON does not match schema', cause);
      
      expect(error.message).toBe('Validation failed: JSON does not match schema');
      expect(error.cause).toBe(cause);
    });
  });

  describe('FileSystemError', () => {
    it('should create file system error', () => {
      const error = new FileSystemError('Cannot read file');
      
      expect(error).toBeInstanceOf(StructPDFError);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.name).toBe('FileSystemError');
      expect(error.message).toBe('File system error: Cannot read file');
    });

    it('should create file system error with cause', () => {
      const cause = new Error('ENOENT: no such file or directory');
      const error = new FileSystemError('File not found', cause);
      
      expect(error.message).toBe('File system error: File not found');
      expect(error.cause).toBe(cause);
    });
  });

  describe('Error inheritance', () => {
    const errorClasses = [
      InjectionError,
      ExtractionError, 
      ValidationError,
      FileSystemError
    ];

    errorClasses.forEach((ErrorClass) => {
      it(`${ErrorClass.name} should be catchable as StructPDFError`, () => {
        const error = new ErrorClass('Test message');
        
        try {
          throw error;
        } catch (caught) {
          expect(caught).toBeInstanceOf(StructPDFError);
          expect(caught).toBeInstanceOf(ErrorClass);
          expect(caught).toBeInstanceOf(Error);
        }
      });
    });
  });
});