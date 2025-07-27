import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { PDFHandler } from '../core/pdf-handler';
import { STRUCTPDF_CONSTANTS, SUPPORTED_HASH_ALGORITHMS } from '../core/constants';
import { decompress } from './decompression';
import { ExtractionError, ValidationError, FileSystemError, StructPDFError } from '../core/errors';
import { PathValidator } from '../core/validation';
import {
  StructPDFPayload,
  ExtractionOptions,
  ExtractionResult
} from '../types';

export class StructPDFExtractor {

  async extract(
    pdfPath: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    try {
      // Validate file path
      const validatedPdfPath = PathValidator.validatePath(pdfPath);
      await PathValidator.validateFileExists(validatedPdfPath);
      
      // Read PDF
      const pdfBytes = await fs.readFile(validatedPdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const handler = new PDFHandler(pdfDoc);

      // Check if has StructPDF data
      if (!handler.hasStructPDFData()) {
        return {
          success: false,
          errors: ['No StructPDF data found in PDF']
        };
      }

      // Get embedded files
      const files = handler.getEmbeddedFiles();
      const structpdfData = files.get(`(${STRUCTPDF_CONSTANTS.EMBEDDED_FILE_NAME})`);

      if (!structpdfData) {
        return {
          success: false,
          errors: ['StructPDF file not found in embedded files']
        };
      }

      // Parse data
      let jsonString: string;
      let payload: StructPDFPayload;

      try {
        // Check if data is compressed (gzip header: 0x1F 0x8B or zlib header: 0x78 0x9c)
        let dataToProcess = structpdfData;
        const isGzip = dataToProcess.length >= 2 && 
                      dataToProcess[0] === 0x1F && 
                      dataToProcess[1] === 0x8B;
        const isZlib = dataToProcess.length >= 2 && 
                      dataToProcess[0] === 0x78 && 
                      dataToProcess[1] === 0x9c;
        const isCompressed = isGzip || isZlib;
        
        // Decompress if needed and allowed (handle multiple compression layers)
        if (isCompressed && options.decompress !== false) {
          let decompressedData = dataToProcess;
          let decompressionCount = 0;
          
                  // Keep decompressing until no more compression is detected
        while (decompressionCount < STRUCTPDF_CONSTANTS.COMPRESSION.MAX_LAYERS) { // Configurable limit
            const isStillCompressed = (decompressedData.length >= 2 && 
                                     decompressedData[0] === 0x1F && 
                                     decompressedData[1] === 0x8B) ||
                                    (decompressedData.length >= 2 && 
                                     decompressedData[0] === 0x78 && 
                                     decompressedData[1] === 0x9c);
            
            if (!isStillCompressed) break;
            
            decompressedData = await decompress(decompressedData);
            decompressionCount++;
          }
          
          dataToProcess = decompressedData;
        } else if (isCompressed && options.decompress === false) {
          throw new Error('Data is compressed but decompress option is false');
        }
        
        // Parse JSON
        jsonString = new TextDecoder().decode(dataToProcess);
        payload = JSON.parse(jsonString);

      } catch (error: any) {
        return {
          success: false,
          errors: [`Failed to parse StructPDF data: ${error.message}`]
        };
      }

      // Verify integrity if requested
      if (options.verifyIntegrity && payload.metadata?.integrity) {
        const algorithm = payload.metadata.integrity.algorithm;
        
        // Validate hash algorithm
        if (!SUPPORTED_HASH_ALGORITHMS.includes(algorithm)) {
          return {
            success: false,
            data: payload,
            errors: [`Unsupported hash algorithm: ${algorithm}. Supported: ${SUPPORTED_HASH_ALGORITHMS.join(', ')}`]
          };
        }
        
        try {
          const dataString = JSON.stringify(payload.payload);
          const hash = crypto.createHash(algorithm)
            .update(dataString)
            .digest('hex');
          
          if (hash !== payload.metadata.integrity.hash) {
            return {
              success: false,
              data: payload,
              errors: ['Integrity check failed: data may have been modified']
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: payload,
            errors: [`Integrity verification failed: ${error.message}`]
          };
        }
      }

      // No validation - empty warnings array
      const warnings: string[] = [];

      const result: ExtractionResult = {
        success: true,
        data: payload // Return complete StructPDFPayload
      };
      
      if (warnings.length > 0) {
        result.warnings = warnings;
      }
      
      return result;

    } catch (error: any) {
      if (error instanceof StructPDFError) {
        return {
          success: false,
          errors: [error.message]
        };
      }
      return {
        success: false,
        errors: [`Extraction failed: ${error.message}`]
      };
    }
  }

  /**
   * Quick check if PDF has StructPDF data
   */
  async hasStructPDFData(pdfPath: string): Promise<boolean> {
    try {
      const pdfBytes = await fs.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const handler = new PDFHandler(pdfDoc);
      return handler.hasStructPDFData();
    } catch {
      return false;
    }
  }
}