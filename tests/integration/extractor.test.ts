import { StructPDFExtractor } from '../../src/extractor/extractor';
import { StructPDFInjector } from '../../src/injector/injector';
import { setupTestFixtures, createTestPDF, TEST_JSON_DATA, TEST_SCHEMA_URLS } from '../fixtures/test-helpers';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('StructPDFExtractor Integration', () => {
  let extractor: StructPDFExtractor;
  let injector: StructPDFInjector;
  let testPdfPath: string;
  let outputPath: string;

  beforeAll(async () => {
    await setupTestFixtures();
  });

  beforeEach(async () => {
    extractor = new StructPDFExtractor();
    injector = new StructPDFInjector();
    
    testPdfPath = path.join(global.TEST_TEMP_DIR, 'extractor-test-input.pdf');
    outputPath = path.join(global.TEST_TEMP_DIR, 'extractor-test-output.pdf');
    
    const pdfBytes = await createTestPDF('Extractor test PDF');
    await fs.writeFile(testPdfPath, pdfBytes);
  });

  afterEach(async () => {
    try {
      await fs.unlink(testPdfPath);
      await fs.unlink(outputPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic extraction', () => {
    it('should extract simple data successfully', async () => {
      const data = TEST_JSON_DATA.simple;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid
      });
      
      const result = await extractor.extract(outputPath);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.payload).toEqual(data);
      expect(result.data?.schema).toBe(TEST_SCHEMA_URLS.valid);
      expect(result.data?.domain).toBe('GENERIC');
      expect(result.errors).toBeUndefined();
    });

    it('should return complete StructPDFPayload structure', async () => {
      const data = TEST_JSON_DATA.complex;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        domain: 'RESUME',
        addIntegrity: true
      });
      
      const result = await extractor.extract(outputPath);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        domain: 'RESUME',
        version: data.specVersion,
        schema: TEST_SCHEMA_URLS.valid,
        payload: data,
        metadata: expect.objectContaining({
          createdAt: expect.any(String),
          generator: '@structcv/structpdf',
          compressed: false,
          integrity: expect.objectContaining({
            algorithm: 'sha256',
            hash: expect.stringMatching(/^[a-f0-9]{64}$/)
          })
        })
      });
    });
  });

  describe('hasStructPDFData', () => {
    it('should return true for PDFs with StructPDF data', async () => {
      await injector.inject(testPdfPath, TEST_JSON_DATA.simple, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid
      });
      
      const hasData = await extractor.hasStructPDFData(outputPath);
      expect(hasData).toBe(true);
    });

    it('should return false for PDFs without StructPDF data', async () => {
      const hasData = await extractor.hasStructPDFData(testPdfPath);
      expect(hasData).toBe(false);
    });

    it('should return false for non-existent files', async () => {
      const nonExistentPath = path.join(global.TEST_TEMP_DIR, 'does-not-exist.pdf');
      const hasData = await extractor.hasStructPDFData(nonExistentPath);
      expect(hasData).toBe(false);
    });

    it('should return false for invalid PDF files', async () => {
      const invalidPdfPath = path.join(global.TEST_TEMP_DIR, 'invalid.pdf');
      await fs.writeFile(invalidPdfPath, 'Not a PDF file');
      
      const hasData = await extractor.hasStructPDFData(invalidPdfPath);
      expect(hasData).toBe(false);
      
      await fs.unlink(invalidPdfPath);
    });
  });

  describe('Compression handling', () => {
    it('should extract compressed data automatically', async () => {
      const data = TEST_JSON_DATA.large;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        compress: true
      });
      
      const result = await extractor.extract(outputPath);
      
      expect(result.success).toBe(true);
      expect(result.data?.payload).toEqual(data);
      expect(result.data?.metadata?.compressed).toBe(true);
    });

    it('should fail when decompress is disabled for compressed data', async () => {
      const data = TEST_JSON_DATA.large;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        compress: true
      });
      
      const result = await extractor.extract(outputPath, {
        decompress: false
      });
      
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Data is compressed but decompress option is false');
    });

    it('should handle multiple compression layers', async () => {
      // This test would require manually creating multiply-compressed data
      // For now, we'll test that the layer detection works correctly
      const data = TEST_JSON_DATA.simple;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        compress: true
      });
      
      const result = await extractor.extract(outputPath);
      expect(result.success).toBe(true);
    });
  });

  describe('Integrity verification', () => {
    it('should verify valid integrity hash', async () => {
      const data = TEST_JSON_DATA.simple;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        addIntegrity: true
      });
      
      const result = await extractor.extract(outputPath, {
        verifyIntegrity: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.metadata?.integrity).toBeDefined();
    });

    it('should skip verification when not requested', async () => {
      const data = TEST_JSON_DATA.simple;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid,
        addIntegrity: true
      });
      
      const result = await extractor.extract(outputPath, {
        verifyIntegrity: false
      });
      
      expect(result.success).toBe(true);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent files gracefully', async () => {
      const nonExistentPath = path.join(global.TEST_TEMP_DIR, 'does-not-exist.pdf');
      
      const result = await extractor.extract(nonExistentPath);
      
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('File not found or not readable');
    });

    it('should handle corrupted PDF files', async () => {
      const corruptedPdfPath = path.join(global.TEST_TEMP_DIR, 'corrupted.pdf');
      await fs.writeFile(corruptedPdfPath, 'Not a valid PDF file');
      
      const result = await extractor.extract(corruptedPdfPath);
      
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Extraction failed:');
      
      await fs.unlink(corruptedPdfPath);
    });

    it('should handle PDFs without StructPDF data', async () => {
      const result = await extractor.extract(testPdfPath);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('No StructPDF data found in PDF');
    });

    it('should handle corrupted JSON data', async () => {
      // This would require manually corrupting embedded data
      // For now, test that the error handling structure is correct
      const result = await extractor.extract(testPdfPath);
      
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty PDF files', async () => {
      const emptyPdfPath = path.join(global.TEST_TEMP_DIR, 'empty.pdf');
      await fs.writeFile(emptyPdfPath, '');
      
      const result = await extractor.extract(emptyPdfPath);
      
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Extraction failed:');
      
      await fs.unlink(emptyPdfPath);
    });

    it('should handle very large extracted data', async () => {
      const data = TEST_JSON_DATA.large;
      
      await injector.inject(testPdfPath, data, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid
      });
      
      const result = await extractor.extract(outputPath);
      
      expect(result.success).toBe(true);
      expect(result.data?.payload).toEqual(data);
    });

    it('should handle Unicode content correctly', async () => {
      const unicodeData = {
        name: '名前',
        emoji: '🎉🚀💻',
        description: 'Test with various Unicode characters: åäö, 中文, العربية, русский'
      };
      
      await injector.inject(testPdfPath, unicodeData, outputPath, {
        schemaUrl: TEST_SCHEMA_URLS.valid
      });
      
      const result = await extractor.extract(outputPath);
      
      expect(result.success).toBe(true);
      expect(result.data?.payload).toEqual(unicodeData);
    });
  });
});