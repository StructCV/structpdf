import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { EmbeddedFileManager } from '../core/embedded-file';
import { PDFHandler } from '../core/pdf-handler';
import { STRUCTPDF_CONSTANTS, PDF_METADATA_KEYS, SUPPORTED_HASH_ALGORITHMS } from '../core/constants';
import { compress } from './compression';
import { InjectionError, ValidationError, FileSystemError, StructPDFError } from '../core/errors';
import { PathValidator, URLValidator, JSONValidator } from '../core/validation';
import {
  StructPDFPayload,
  InjectionOptions,
  InjectionResult,
  PayloadMetadata,
  JSONValue
} from '../types';

export class StructPDFInjector {

  async inject(
    pdfPath: string,
    data: JSONValue,
    outputPath: string,
    options: InjectionOptions
  ): Promise<InjectionResult> {
    try {
      // Validate inputs
      this.validateInputs(pdfPath, data, outputPath, options);
      
      // Validate file paths
      const validatedPdfPath = PathValidator.validatePath(pdfPath);
      const validatedOutputPath = PathValidator.validatePath(outputPath);
      
      await PathValidator.validateFileExists(validatedPdfPath);
      await PathValidator.validateOutputPath(validatedOutputPath);
      
      // Read PDF
      const pdfBytes = await fs.readFile(validatedPdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const handler = new PDFHandler(pdfDoc);

      // Check if already has StructPDF data
      if (!options.overwrite && handler.hasStructPDFData()) {
        throw new Error('PDF already contains StructPDF data. Use overwrite option to replace.');
      }

      // Prepare payload
      const payload = await this.preparePayload(data, options);
      
      // Check if compression will be needed
      let tempBytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
      const willCompress = options.compress && tempBytes.length > STRUCTPDF_CONSTANTS.COMPRESSION.THRESHOLD;
      
      // Update compression flag BEFORE final serialization
      if (willCompress) {
        payload.metadata!.compressed = true;
      }
      
      // Convert to bytes with final payload
      let dataBytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));

      // Compress if needed
      if (willCompress) {
        dataBytes = await compress(dataBytes);
      }

      // Check size
      if (dataBytes.length > STRUCTPDF_CONSTANTS.MAX_PAYLOAD_SIZE) {
        throw new Error(`Payload too large: ${dataBytes.length} bytes (max: ${STRUCTPDF_CONSTANTS.MAX_PAYLOAD_SIZE})`);
      }

      // Remove existing if overwriting
      if (options.overwrite) {
        EmbeddedFileManager.removeFile(pdfDoc, STRUCTPDF_CONSTANTS.EMBEDDED_FILE_NAME);
      }

      // Embed file
      await EmbeddedFileManager.embedFile(
        pdfDoc,
        STRUCTPDF_CONSTANTS.EMBEDDED_FILE_NAME,
        dataBytes,
        STRUCTPDF_CONSTANTS.MIME_TYPE
      );

      // Add metadata
      handler.addMetadata(PDF_METADATA_KEYS.HAS_STRUCTPDF, 'true');
      handler.addMetadata(PDF_METADATA_KEYS.STRUCTPDF_VERSION, this.extractVersion(data));
      handler.addMetadata(PDF_METADATA_KEYS.STRUCTPDF_DOMAIN, payload.domain);

      // Save PDF
      const modifiedPdfBytes = await pdfDoc.save();
      await fs.writeFile(validatedOutputPath, modifiedPdfBytes);

      const result: InjectionResult = {
        success: true,
        outputPath,
        metadata: payload.metadata!
      };
      
      if (willCompress) {
        result.warnings = ['Data was compressed'];
      }
      
      return result;

    } catch (error: any) {
      if (error instanceof StructPDFError) {
        throw error;
      }
      throw new InjectionError(error.message, error);
    }
  }

  /**
   * Validates all inputs before processing
   */
  private validateInputs(
    pdfPath: string, 
    data: JSONValue, 
    outputPath: string, 
    options: InjectionOptions
  ): void {
    // Validate JSON data
    if (!JSONValidator.validateJSON(data)) {
      throw new ValidationError('Invalid JSON data provided');
    }

    // Validate schema URL
    const urlValidation = URLValidator.validateSchemaURL(options.schemaUrl);
    if (!urlValidation.valid) {
      throw new ValidationError('Invalid schema URL provided');
    }
    if (urlValidation.warning) {
      console.warn(`Warning: ${urlValidation.warning}`);
    }

    // Validate domain
    if (options.domain && typeof options.domain !== 'string') {
      throw new ValidationError('Domain must be a string');
    }
  }

  /**
   * Extracts version from data object
   */
  private extractVersion(data: JSONValue): string {
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const obj = data as Record<string, JSONValue>;
      if (typeof obj.specVersion === 'string') {
        return obj.specVersion;
      }
    }
    return 'unknown';
  }

  private async preparePayload(
    data: any,
    options: InjectionOptions
  ): Promise<StructPDFPayload> {
    const metadata: PayloadMetadata = {
      createdAt: new Date().toISOString(),
      generator: STRUCTPDF_CONSTANTS.GENERATOR,
      compressed: false
    };

    // Add integrity hash if requested
    if (options.addIntegrity) {
      const dataString = JSON.stringify(data);
      const hash = crypto.createHash('sha256').update(dataString).digest('hex');
      metadata.integrity = {
        algorithm: 'sha256',
        hash
      };
    }

    // Use provided schema URL (now required)
    const schemaUrl = options.schemaUrl;

    return {
      domain: options.domain || 'GENERIC',
      version: this.extractVersion(data),
      schema: schemaUrl,
      payload: data,
      metadata
    };
  }


}