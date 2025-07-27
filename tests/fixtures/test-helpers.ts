import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Creates a simple test PDF with specified content
 */
export async function createTestPDF(content = 'Test PDF Content'): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  
  // Add some text to make it a valid PDF with content
  page.drawText(content, {
    x: 50,
    y: 750,
    size: 12,
  });
  
  return await pdfDoc.save();
}

/**
 * Creates test PDF files in the fixtures directory
 */
export async function setupTestFixtures(): Promise<void> {
  const fixturesDir = global.TEST_FIXTURES_DIR;
  
  // Create simple test PDF
  const simplePdf = await createTestPDF('Simple test PDF');
  await fs.writeFile(path.join(fixturesDir, 'simple.pdf'), simplePdf);
  
  // Create larger test PDF
  const largePdf = await createTestPDF('Large test PDF with more content\n'.repeat(100));
  await fs.writeFile(path.join(fixturesDir, 'large.pdf'), largePdf);
  
  // Create corrupted PDF (invalid content)
  await fs.writeFile(path.join(fixturesDir, 'corrupted.pdf'), 'Not a PDF file');
  
  // Create empty file
  await fs.writeFile(path.join(fixturesDir, 'empty.pdf'), '');
}

/**
 * Test data samples
 */
export const TEST_JSON_DATA = {
  simple: {
    name: 'John Doe',
    age: 30,
    skills: ['JavaScript', 'TypeScript']
  },
  
  complex: {
    specVersion: '1.0.0',
    basics: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1-555-0123',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        country: 'USA'
      }
    },
    experience: [
      {
        company: 'Tech Corp',
        position: 'Senior Developer',
        duration: '2020-2023',
        technologies: ['React', 'Node.js', 'TypeScript']
      },
      {
        company: 'StartupX',
        position: 'Frontend Developer',
        duration: '2018-2020',
        technologies: ['Vue.js', 'JavaScript', 'CSS']
      }
    ],
    education: {
      degree: 'Computer Science',
      university: 'Tech University',
      year: 2018
    },
    skills: {
      technical: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      soft: ['Leadership', 'Communication', 'Problem Solving']
    }
  },
  
  large: {
    // Large dataset for compression testing - must be > 1KB when JSON stringified
    data: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `This is a very long description for item ${i} that will make the JSON payload large enough to trigger compression. `.repeat(20),
      metadata: {
        created: new Date().toISOString(),
        tags: [`tag${i}`, `category${i % 10}`, 'test', 'compression', 'large-data'],
        value: Math.random() * 1000,
        additionalInfo: `Extra data to increase size: ${'x'.repeat(100)}`
      }
    }))
  }
};

export const TEST_SCHEMA_URLS = {
  valid: 'https://schemas.structcv.com/resume/v1.json',
  localhost: 'http://localhost:3000/schema.json',
  invalid: 'not-a-url',
  http: 'http://example.com/schema.json'
};