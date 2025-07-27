# @structcv/structpdf

[![npm version](https://badge.fury.io/js/%40structcv%2Fstructpdf.svg)](https://badge.fury.io/js/%40structcv%2Fstructpdf)
[![Build Status](https://github.com/StructCV/structpdf/workflows/CI/badge.svg)](https://github.com/StructCV/structpdf/actions)
[![Coverage Status](https://coveralls.io/repos/github/StructCV/structpdf/badge.svg?branch=main)](https://coveralls.io/github/StructCV/structpdf?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A professional TypeScript library for embedding and extracting JSON data in PDF files with compression, integrity checking, and validation.

## Features

✨ **Core Features**
- 📄 Embed JSON data directly into PDF files as embedded files
- 🔍 Extract JSON data from PDFs with validation
- 🗜️ Automatic compression for large payloads (gzip/zlib)
- 🔐 Integrity checking with cryptographic hashes
- 📋 Schema validation support
- 🛡️ Path traversal protection and security validation
- 🖥️ Cross-platform support (Windows, macOS, Linux)

🔧 **Developer Experience**
- 💪 Full TypeScript support with strict types
- 🎯 Minimal dependencies (only pdf-lib + pako)
- 📚 Comprehensive error handling
- 🧪 Thoroughly tested (90%+ coverage)
- 📖 Complete documentation and examples

## Installation

```bash
npm install @structcv/structpdf
```

## Quick Start

### Basic Usage

```typescript
import { StructPDFInjector, StructPDFExtractor } from '@structcv/structpdf';

// Initialize the injector and extractor
const injector = new StructPDFInjector();
const extractor = new StructPDFExtractor();

// Embed JSON data into a PDF
const jsonData = {
  name: "John Doe",
  email: "john@example.com",
  skills: ["JavaScript", "TypeScript", "React"]
};

await injector.inject(
  'input.pdf',
  jsonData,
  'output.pdf',
  {
    schemaUrl: 'https://example.com/schema.json',
    compress: true,
    addIntegrity: true,
    domain: 'RESUME'
  }
);

// Extract JSON data from a PDF
const result = await extractor.extract('output.pdf', {
  verifyIntegrity: true,
  decompress: true
});

if (result.success) {
  console.log('Extracted data:', result.data?.payload);
} else {
  console.error('Extraction failed:', result.errors);
}
```

### CLI Usage (NOT YET)

The CLI will be available as a separate package for a lightweight core library:

```bash
# Install the CLI separately
npm install -g @structcv/structpdf-cli

# Or use npx without installing
npx @structcv/structpdf-cli inject input.pdf data.json output.pdf --schema https://example.com/schema.json
```

See [@structcv/structpdf-cli](https://www.npmjs.com/package/@structcv/structpdf-cli) for CLI documentation.

## API Reference

### StructPDFInjector

#### `inject(pdfPath, data, outputPath, options)`

Embeds JSON data into a PDF file.

**Parameters:**
- `pdfPath` (string): Path to the input PDF file
- `data` (JSONValue): JSON data to embed
- `outputPath` (string): Path for the output PDF file
- `options` (InjectionOptions): Configuration options

**Options:**
```typescript
interface InjectionOptions {
  schemaUrl: string;           // Required: URL to JSON schema
  compress?: boolean;          // Enable compression (default: false)
  addIntegrity?: boolean;      // Add integrity hash (default: false)
  overwrite?: boolean;         // Overwrite existing data (default: false)
  domain?: string;             // Domain identifier (default: 'GENERIC')
}
```

**Returns:** `Promise<InjectionResult>`

### StructPDFExtractor

#### `extract(pdfPath, options?)`

Extracts JSON data from a PDF file.

**Parameters:**
- `pdfPath` (string): Path to the PDF file
- `options` (ExtractionOptions): Optional configuration

**Options:**
```typescript
interface ExtractionOptions {
  decompress?: boolean;        // Auto-decompress data (default: true)
  verifyIntegrity?: boolean;   // Verify integrity hash (default: false)
}
```

**Returns:** `Promise<ExtractionResult>`

#### `hasStructPDFData(pdfPath)`

Quick check if a PDF contains StructPDF data.

**Returns:** `Promise<boolean>`

## Data Structure

The embedded JSON follows this structure:

```typescript
interface StructPDFPayload {
  domain: string;              // e.g., "RESUME", "INVOICE", "CONTRACT"
  version: string;             // Version from your data
  schema: string;              // Schema URL for validation
  payload: JSONValue;          // Your actual JSON data
  metadata?: PayloadMetadata;  // Automatic metadata
}

interface PayloadMetadata {
  createdAt: string;           // ISO timestamp
  generator: string;           // Library identifier
  compressed?: boolean;        // Compression flag
  integrity?: {                // Optional integrity check
    algorithm: string;         // Hash algorithm (sha256, etc.)
    hash: string;             // Hex hash of payload
  };
}
```

## Examples

### Resume Processing

```typescript
import { StructPDFInjector, StructPDFExtractor } from '@structcv/structpdf';

const resume = {
  specVersion: "1.0.0",
  personalInfo: {
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "+1-555-0123"
  },
  experience: [
    {
      company: "Tech Corp",
      position: "Senior Developer",
      duration: "2020-2023"
    }
  ],
  skills: ["TypeScript", "React", "Node.js"]
};

const injector = new StructPDFInjector();
await injector.inject(
  'resume.pdf',
  resume,
  'resume-with-data.pdf',
  {
    schemaUrl: 'https://schemas.structcv.com/resume/v1.json',
    domain: 'RESUME',
    compress: true,
    addIntegrity: true
  }
);
```

### Batch Processing

```typescript
import { StructPDFExtractor } from '@structcv/structpdf';
import { glob } from 'glob';

const extractor = new StructPDFExtractor();

// Process all PDFs in a directory
const pdfFiles = await glob('documents/*.pdf');
const results = await Promise.all(
  pdfFiles.map(async (file) => {
    const hasData = await extractor.hasStructPDFData(file);
    if (!hasData) return null;
    
    return extractor.extract(file, { verifyIntegrity: true });
  })
);

// Filter successful extractions
const validData = results
  .filter(result => result?.success)
  .map(result => result!.data);
```

### Error Handling

```typescript
import { 
  StructPDFInjector, 
  InjectionError, 
  ValidationError,
  FileSystemError 
} from '@structcv/structpdf';

try {
  const injector = new StructPDFInjector();
  await injector.inject(pdfPath, data, outputPath, options);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  } else if (error instanceof FileSystemError) {
    console.error('File system error:', error.message);
  } else if (error instanceof InjectionError) {
    console.error('Injection failed:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Configuration

### Compression

Compression is automatically applied when:
- Data size > 1KB
- `compress: true` option is set
- Uses gzip compression by default

### Integrity Checking

When `addIntegrity: true`:
- SHA-256 hash is computed for the payload
- Hash is stored in metadata
- Can be verified during extraction with `verifyIntegrity: true`

### Domains

Common domains are predefined:
- `RESUME` - CV/Resume documents
- `INVOICE` - Invoice documents  
- `CONTRACT` - Legal contracts
- `CERTIFICATE` - Certificates
- `REPORT` - Reports
- `GENERIC` - General purpose (default)

## Security

### Path Validation
- Prevents path traversal attacks (`../`)
- Blocks access to system directories
- Cross-platform path handling

### Data Validation
- JSON schema validation support
- Type-safe TypeScript interfaces
- Input sanitization

### Integrity Protection
- Cryptographic hash verification
- Tamper detection
- Multiple hash algorithms supported

## Performance

### Benchmarks
- Small PDFs (< 1MB): ~50ms injection/extraction
- Large PDFs (10MB+): ~200ms injection/extraction
- Compression: 60-80% size reduction for JSON data
- Memory usage: ~2x PDF file size during processing

### Optimization Tips
- Enable compression for large datasets
- Use streaming for very large files
- Batch process multiple files for efficiency

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/StructCV/structpdf.git
cd structpdf

# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Build the project
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/StructCV/structpdf#readme)
- 🐛 [Issue Tracker](https://github.com/StructCV/structpdf/issues)
- 💬 [Discussions](https://github.com/StructCV/structpdf/discussions)
- 📧 Email: support@structcv.com ( not yet )

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.