import * as pako from 'pako';

/**
 * Decompresses data using pako (gunzip or inflate)
 * @param data - The compressed data to decompress
 * @returns Decompressed data as Uint8Array
 */
import { COMPRESSION_SETTINGS } from '../core/constants';

export async function decompress(data: Uint8Array): Promise<Uint8Array> {
  try {
    // Validate minimum size for compression detection
    if (data.length < COMPRESSION_SETTINGS.DETECTION_THRESHOLD) {
      throw new Error('Data too small for compression detection');
    }
    
    // Check if it's gzip (0x1F 0x8B) or zlib (0x78 0x9c)
    const isGzip = data.length >= 2 && data[0] === 0x1F && data[1] === 0x8B;
    const isZlib = data.length >= 2 && data[0] === 0x78 && data[1] === 0x9c;
    
    if (isGzip) {
      return pako.ungzip(data);
    } else if (isZlib) {
      return pako.inflate(data);
    } else {
      throw new Error('Unknown compression format');
    }
  } catch (error: any) {
    throw new Error(`Decompression failed: ${error.message}`);
  }
} 