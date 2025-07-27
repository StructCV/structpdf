import * as pako from 'pako';

/**
 * Compresses data using pako (gzip)
 * @param data - The data to compress
 * @returns Compressed data as Uint8Array
 */
export async function compress(data: Uint8Array): Promise<Uint8Array> {
  try {
    return pako.gzip(data);
  } catch (error: any) {
    throw new Error(`Compression failed: ${error.message}`);
  }
} 