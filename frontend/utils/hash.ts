/**
 * Generates a SHA-256 hash of a file's content.
 * This creates a unique fingerprint that's the same across all machines,
 * regardless of file name, path, or operating system.
 */
export async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
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
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

