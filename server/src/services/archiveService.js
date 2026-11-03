import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { compressImageIfExceedsLimit } from './imageCompressionService.js';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.csv', '.xlsx'];

const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.csv': 'text/csv',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * Safely extracts a ZIP archive with zip-bomb and path traversal defenses
 */
export async function extractZipSafely(zipPath, targetDir, options = {}) {
  const maxEntries = options.maxEntries || parseInt(process.env.MAX_ZIP_ENTRIES, 10) || 50;
  const maxSizeBytes = (options.maxSizeMb || parseInt(process.env.MAX_ZIP_SIZE_MB, 10) || 100) * 1024 * 1024;

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  if (entries.length > maxEntries) {
    throw new Error(`Archive exceeds maximum permitted entries (${entries.length} > ${maxEntries}).`);
  }

  let totalUncompressedSize = 0;
  for (const entry of entries) {
    totalUncompressedSize += entry.header.size;
    if (totalUncompressedSize > maxSizeBytes) {
      throw new Error(`Archive uncompressed size exceeds limit of ${maxSizeBytes / (1024 * 1024)}MB.`);
    }
  }

  const extractedFiles = [];
  const normalizedTargetDir = path.resolve(targetDir);

  if (!fs.existsSync(normalizedTargetDir)) {
    fs.mkdirSync(normalizedTargetDir, { recursive: true });
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const entryName = entry.entryName;
    // Skip macOS metadata and dotfiles
    if (entryName.startsWith('__MACOSX') || path.basename(entryName).startsWith('.')) {
      continue;
    }

    const ext = path.extname(entryName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      // Skip unsupported files inside archive safely
      continue;
    }

    // Zip slip prevention: ensure destination path starts with target directory
    const safeBaseName = path.basename(entryName);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const destinationPath = path.resolve(normalizedTargetDir, uniqueName);

    if (!destinationPath.startsWith(normalizedTargetDir)) {
      throw new Error(`Path traversal attempt detected in entry: ${entryName}`);
    }

    // Extract file buffer and write to disk
    const content = entry.getData();
    fs.writeFileSync(destinationPath, content);

    // Compress image with Sharp if > 1MB
    const comp = await compressImageIfExceedsLimit(destinationPath, safeBaseName, MIME_MAP[ext]);
    const finalSize = comp.compressed ? comp.newSize : content.length;

    extractedFiles.push({
      originalFileName: safeBaseName,
      storedFileName: uniqueName,
      storagePath: destinationPath,
      mimeType: MIME_MAP[ext] || 'application/octet-stream',
      fileSize: finalSize,
      sourceType: 'ZIP_ENTRY',
    });
  }

  return extractedFiles;
}
