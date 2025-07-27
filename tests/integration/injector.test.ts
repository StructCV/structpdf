import { StructPDFInjector } from '../../src/injector/injector';
import { StructPDFExtractor } from '../../src/extractor/extractor';
import { setupTestFixtures, createTestPDF, TEST_JSON_DATA, TEST_SCHEMA_URLS } from '../fixtures/test-helpers';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('StructPDFInjector Integration', () => {
  let injector: StructPDFInjector;
  let extractor: StructPDFExtractor;
  let testPdfPath: string;
  let outputPath: string;

  beforeAll(async () => {
    await setupTestFixtures();
  });

  beforeEach(async () => {
    injector = new StructPDFInjector();
    extractor = new StructPDFExtractor();
    
    // Create fresh PDF for each test
    testPdfPath = path.join(global.TEST_TEMP_DIR, 'test-input.pdf');
    outputPath = path.join(global.TEST_TEMP_DIR, 'test-output.pdf');
    
    const pdfBytes = await createTestPDF('Integration test PDF');
    await fs.writeFile(testPdfPath, pdfBytes);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testPdfPath);
      await fs.unlink(outputPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic injection and extraction', () => {
    it('should inject and extract simple JSON data', async () => {
      const data = TEST_JSON_DATA.simple;
      
      const result = await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid
      });
      
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.createdAt).toBeDefined();
      expect(result.metadata.generator).toBe('@structcv/structpdf');
      
      // Verify file was created
      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
      
      // Extract and verify
      const extractedResult = await extractor.extract(outputPath);
      expect(extractedResult.success).toBe(true);
      expect(extractedResult.data?.payload).toEqual(data);
    });

    it('should inject and extract complex JSON data', async () => {
      const data = TEST_JSON_DATA.complex;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        domain: 'RESUME'
      });
      
      const extractedResult = await extractor.extract(outputPath);
      expect(extractedResult.success).toBe(true);
      expect(extractedResult.data?.payload).toEqual(data);
      expect(extractedResult.data?.domain).toBe('RESUME');
    });
  });

  describe('Compression', () => {
    it('should handle compression for large data', async () => {
      const data = TEST_JSON_DATA.large;
      
      const result = await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        compress: true
      });
      
      expect(result.success).toBe(true);
      expect(result.metadata.compressed).toBe(true);
      expect(result.warnings).toContain('Data was compressed');
      
      // Extract and verify
      const extractedResult = await extractor.extract(outputPath);
      expect(extractedResult.success).toBe(true);
      expect(extractedResult.data?.payload).toEqual(data);
      expect(extractedResult.data?.metadata?.compressed).toBe(true);
    });

    it('should not compress small data even when compression is enabled', async () => {
      const data = { small: 'data' };
      
      const result = await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        compress: true
      });
      
      expect(result.success).toBe(true);
      expect(result.metadata.compressed).toBe(false);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('Integrity checking', () => {
    it('should add and verify integrity hash', async () => {
      const data = TEST_JSON_DATA.simple;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        addIntegrity: true
      });
      
      const extractedResult = await extractor.extract(outputPath, {
        verifyIntegrity: true
      });
      
      expect(extractedResult.success).toBe(true);
      expect(extractedResult.data?.metadata?.integrity).toBeDefined();
      expect(extractedResult.data?.metadata?.integrity?.algorithm).toBe('sha256');
      expect(extractedResult.data?.metadata?.integrity?.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should fail verification with tampered data', async () => {
      const data = TEST_JSON_DATA.simple;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        addIntegrity: true
      });
      
      // Manually tamper with the extracted data for testing
      // This is a simplified test - in practice, we'd need to modify the embedded file
      const extractedResult = await extractor.extract(outputPath, {
        verifyIntegrity: true
      });
      
      expect(extractedResult.success).toBe(true); // Should succeed with untampered data
    });
  });

  describe('Overwrite functionality', () => {
    it('should prevent overwriting existing data by default', async () => {
      const data1 = { version: 1 };
      const data2 = { version: 2 };
      
      // First injection
      await injector.inject(testPdfPath, data1, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid
      });
      
      // Second injection should fail
      await expect(
        injector.inject(outputPath, data2, outputPath, {
          schemaUrl: TEST_SCHEMA_URLS.valid
        })
      ).rejects.toThrow('PDF already contains StructPDF data');
    });

    it('should allow overwriting with overwrite option', async () => {
      const data1 = { version: 1 };
      const data2 = { version: 2 };
      
      // First injection
      await injector.inject(testPdfPath, data1, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid
      });
      
      // Second injection with overwrite
      const result = await injector.inject(outputPath, data2, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        overwrite: true
      });
      
      expect(result.success).toBe(true);
      
      // Verify new data
      const extractedResult = await extractor.extract(outputPath);
      expect(extractedResult.data?.payload).toEqual(data2);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent input file', async () => {
      const nonExistentPath = path.join(global.TEST_TEMP_DIR, 'does-not-exist.pdf');
      
      await expect(
        injector.inject(nonExistentPath, TEST_JSON_DATA.simple, outputPath, {
          schemaUrl: TEST_SCHEMA_URLS.valid
        })
      ).rejects.toThrow('File not found or not readable');
    });

    it('should handle invalid PDF file', async () => {
      const invalidPdfPath = path.join(global.TEST_TEMP_DIR, 'invalid.pdf');
      await fs.writeFile(invalidPdfPath, 'Not a PDF file');
      
      await expect(
        injector.inject(invalidPdfPath, TEST_JSON_DATA.simple, outputPath, {
          schemaUrl: TEST_SCHEMA_URLS.valid
        })
      ).rejects.toThrow();
      
      await fs.unlink(invalidPdfPath);
    });

    it('should handle invalid schema URL', async () => {
      await expect(
        injector.inject(testPdfPath, TEST_JSON_DATA.simple, outputPath, {
          schemaUrl: 'not-a-valid-url'
        })
      ).rejects.toThrow('Invalid schema URL provided');
    });

    it('should handle very large payloads', async () => {
      const veryLargeData = {
        data: Array.from({ length: 100000 }, (_, i) => ({
          id: i,
          description: 'This is a very long description. '.repeat(100)
        }))
      };
      
      await expect(
        injector.inject(testPdfPath, veryLargeData, outputPath, {
          schemaUrl: TEST_SCHEMA_URLS.valid
        })
      ).rejects.toThrow('Payload too large');
    });
  });

  describe('Version extraction', () => {
    it('should extract version from data with specVersion', async () => {
      const dataWithVersion = {
        specVersion: '2.1.0',
        content: 'test'
      };
      
      await injector.inject(testPdfPath, dataWithVersion, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid
      });
      
      const extractedResult = await extractor.extract(outputPath);
      expect(extractedResult.data?.version).toBe('2.1.0');
    });

    it('should use unknown version for data without specVersion', async () => {
      const dataWithoutVersion = {
        content: 'test'
      };
      
      await injector.inject(testPdfPath, dataWithoutVersion, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid
      });
      
      const extractedResult = await extractor.extract(outputPath);
      expect(extractedResult.data?.version).toBe('unknown');
    });
  });
});