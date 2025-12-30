import { sha256 } from 'js-sha256';

/**
 * Generates a SHA-256 hash of a file's content.
 * This creates a unique fingerprint that's the same across all machines,
 * regardless of file name, path, or operating system.
 * 
 * Uses js-sha256 which works in any context (HTTP, HTTPS, localhost).
 */
export async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return sha256(buffer);
}

/**
 * For very large files (>500MB), hash only portions for speed.
 * Still very reliable since it includes size + samples from different parts.
 * 
 * Uses: file size + first 1MB + middle 1MB + last 1MB
 */
export async function generateFastFileHash(file: File): Promise<string> {
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  
  // For small files, just hash the entire thing
  if (file.size <= CHUNK_SIZE * 3) {
    return generateFileHash(file);
  }
  
  const size = file.size;
  const chunks: ArrayBuffer[] = [];
  
  // First 1MB
  chunks.push(await file.slice(0, CHUNK_SIZE).arrayBuffer());
  
  // Middle 1MB
  const midStart = Math.floor(size / 2) - CHUNK_SIZE / 2;
  chunks.push(await file.slice(midStart, midStart + CHUNK_SIZE).arrayBuffer());
  
  // Last 1MB
  chunks.push(await file.slice(-CHUNK_SIZE).arrayBuffer());
  
  // Combine all chunks with size as prefix
  const sizeBuffer = new TextEncoder().encode(size.toString());
  const totalLength = sizeBuffer.byteLength + chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  
  let offset = 0;
  combined.set(sizeBuffer, offset);
  offset += sizeBuffer.byteLength;
  
  for (const chunk of chunks) {
    combined.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  
  return sha256(combined);
}
