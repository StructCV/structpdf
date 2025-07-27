// Type for valid JSON data
export type JSONValue = 
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

export interface StructPDFPayload {
  domain: string; // Configurable domain (e.g., "RESUME", "INVOICE", "CONTRACT")
  version: string;
  schema: string;
  payload: JSONValue; // Valid JSON data (generic)
  metadata?: PayloadMetadata;
  specName?: string; // Human-readable specification name (e.g., "StructCV Resume Format")
  specID?: string; // Technical specification identifier (e.g., "STRUCTCV")
}

import { HashAlgorithm } from '../core/constants';

export interface PayloadMetadata {
  createdAt: string;
  updatedAt?: string;
  generator: string;
  compressed?: boolean;
  integrity?: {
    algorithm: HashAlgorithm;
    hash: string;
  };
}

export interface InjectionOptions {
  compress?: boolean;
  addIntegrity?: boolean;
  overwrite?: boolean;
  domain?: string; // Domain for the payload (e.g., "RESUME", "INVOICE", "CONTRACT")
  schemaUrl: string; // Schema URL (required for documentation and interoperability)
  specName?: string; // Human-readable specification name (e.g., "StructCV Resume Format")
  specID?: string; // Technical specification identifier (e.g., "STRUCTCV")
}

export interface ExtractionOptions {
  decompress?: boolean;
  verifyIntegrity?: boolean;
}

export interface InjectionResult {
  success: boolean;
  outputPath: string;
  metadata: PayloadMetadata;
  warnings?: string[];
}

export interface ExtractionResult {
  success: boolean;
  data?: StructPDFPayload; // Complete StructPDFPayload instead of just the payload
  errors?: string[];
  warnings?: string[];
}
