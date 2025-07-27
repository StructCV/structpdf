// Main exports
export { StructPDFInjector } from './injector/injector';
export { StructPDFExtractor } from './extractor/extractor';

// Type exports
export type {
  StructPDFPayload,
  PayloadMetadata,
  InjectionOptions,
  ExtractionOptions,
  InjectionResult,
  ExtractionResult
} from './types/index';

// Constants export for advanced usage
export { STRUCTPDF_CONSTANTS, PDF_METADATA_KEYS } from './core/constants';