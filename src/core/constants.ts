// Supported hash algorithms
export const SUPPORTED_HASH_ALGORITHMS = [
  'md5',
  'sha1', 
  'sha256',
  'sha384',
  'sha512'
] as const;

export type HashAlgorithm = typeof SUPPORTED_HASH_ALGORITHMS[number];

// Common domains (extensible)
export const COMMON_DOMAINS = [
  'RESUME',
  'INVOICE', 
  'CONTRACT',
  'CERTIFICATE',
  'REPORT',
  'GENERIC'
] as const;

export type CommonDomain = typeof COMMON_DOMAINS[number];

// Compression settings
export const COMPRESSION_SETTINGS = {
  MAX_LAYERS: 5, // Maximum compression layers
  MIN_SIZE: 64, // Minimum size to consider compression
  DETECTION_THRESHOLD: 2 // Minimum bytes to check for compression headers
} as const;

export const STRUCTPDF_CONSTANTS = {
    EMBEDDED_FILE_NAME: 'structpdf.json',
    MIME_TYPE: 'application/json',
    GENERATOR: '@structcv/structpdf',
    COMPRESSION: {
      LEVEL: 9, // Maximum compression
      THRESHOLD: 1024, // Compress if larger than 1KB
      MAX_LAYERS: COMPRESSION_SETTINGS.MAX_LAYERS
    },
    MAX_PAYLOAD_SIZE: 10 * 1024 * 1024 // 10MB
  } as const;

  export const PDF_METADATA_KEYS = {
    HAS_STRUCTPDF: 'HasStructPDF',
    STRUCTPDF_VERSION: 'StructPDFVersion',
    STRUCTPDF_DOMAIN: 'StructPDFDomain'
  } as const;