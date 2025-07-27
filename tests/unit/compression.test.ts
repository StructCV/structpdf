import { compress } from '../../src/injector/compression';
import { decompress } from '../../src/extractor/decompression';

describe('Compression', () => {
  const testData = 'This is test data that will be compressed and decompressed. '.repeat(100);
  const testBytes = new TextEncoder().encode(testData);

  describe('compress', () => {
    it('should compress data successfully', async () => {
      const compressed = await compress(testBytes);
      
      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed.length).toBeLessThan(testBytes.length);
      
      // Check gzip header
      expect(compressed[0]).toBe(0x1F);
      expect(compressed[1]).toBe(0x8B);
    });

    it('should handle empty data', async () => {
      const emptyData = new Uint8Array(0);
      const compressed = await compress(emptyData);
      
      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed.length).toBeGreaterThan(0); // Gzip has overhead
    });

    it('should handle small data', async () => {
      const smallData = new TextEncoder().encode('small');
      const compressed = await compress(smallData);
      
      expect(compressed).toBeInstanceOf(Uint8Array);
      // Small data might be larger after compression due to overhead
    });
  });

  describe('decompress', () => {
    it('should decompress gzip data successfully', async () => {
      const compressed = await compress(testBytes);
      const decompressed = await decompress(compressed);
      
      expect(decompressed).toBeInstanceOf(Uint8Array);
      expect(decompressed.length).toBe(testBytes.length);
      
      const decompressedText = new TextDecoder().decode(decompressed);
      expect(decompressedText).toBe(testData);
    });

    it('should handle invalid compression format', async () => {
      const invalidData = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);
      
      await expect(decompress(invalidData)).rejects.toThrow('Unknown compression format');
    });

    it('should handle data too small for detection', async () => {
      const tooSmall = new Uint8Array([0x1F]);
      
      await expect(decompress(tooSmall)).rejects.toThrow('Data too small for compression detection');
    });

    it('should handle corrupted gzip data', async () => {
      const corruptedGzip = new Uint8Array([0x1F, 0x8B, 0xFF, 0xFF, 0xFF]);
      
      await expect(decompress(corruptedGzip)).rejects.toThrow('Decompression failed');
    });

    it('should handle zlib format', async () => {
      // Create zlib compressed data manually for testing
      const pako = require('pako');
      const zlibData = pako.deflate(testBytes);
      
      const decompressed = await decompress(zlibData);
      const decompressedText = new TextDecoder().decode(decompressed);
      expect(decompressedText).toBe(testData);
    });
  });

  describe('round-trip compression', () => {
    const testCases = [
      { name: 'short string', data: 'Hello, World!' },
      { name: 'long string', data: 'This is a longer string. '.repeat(50) },
      { name: 'JSON data', data: JSON.stringify({ 
        name: 'John', 
        items: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` }))
      })},
      { name: 'unicode text', data: '🎉 Unicode test with émojis and accénts! 中文测试' },
      { name: 'binary-like data', data: String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i)) }
    ];

    testCases.forEach(({ name, data }) => {
      it(`should handle round-trip for ${name}`, async () => {
        const originalBytes = new TextEncoder().encode(data);
        const compressed = await compress(originalBytes);
        const decompressed = await decompress(compressed);
        const result = new TextDecoder().decode(decompressed);
        
        expect(result).toBe(data);
        expect(decompressed.length).toBe(originalBytes.length);
      });
    });
  });
});