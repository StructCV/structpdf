import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

// Global test setup
declare global {
  var TEST_TEMP_DIR: string;
  var TEST_FIXTURES_DIR: string;
}

beforeAll(async () => {
  // Set up global test directories
  global.TEST_TEMP_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'structpdf-test-'));
  global.TEST_FIXTURES_DIR = path.join(__dirname, 'fixtures');
  
  // Ensure fixtures directory exists
  try {
    await fs.access(global.TEST_FIXTURES_DIR);
  } catch {
    await fs.mkdir(global.TEST_FIXTURES_DIR, { recursive: true });
  }
});

afterAll(async () => {
  // Clean up temp directory
  try {
    await fs.rm(global.TEST_TEMP_DIR, { recursive: true, force: true });
  } catch (error) {
    console.warn('Failed to clean up temp directory:', error);
  }
});

// Increase timeout for PDF operations
jest.setTimeout(30000);