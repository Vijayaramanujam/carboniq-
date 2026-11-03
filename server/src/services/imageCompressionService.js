import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ONE_MB = 1024 * 1024; // 1 Megabyte in bytes
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp'];

/**
 * Checks if an image exceeds 1MB and compresses it using sharp
 * Returns updated file information
 */
export async function compressImageIfExceedsLimit(filePath, originalFileName, mimeType) {
  const ext = path.extname(originalFileName || filePath).toLowerCase();
  const isImage = IMAGE_EXTENSIONS.includes(ext) || (mimeType && mimeType.startsWith('image/'));

  if (!isImage || !fs.existsSync(filePath)) {
    return { compressed: false, size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0 };
  }

  const stat = fs.statSync(filePath);
  const originalSize = stat.size;

  if (originalSize <= ONE_MB) {
    return { compressed: false, size: originalSize };
  }

  const tempOutputPath = `${filePath}-compressed${ext}`;

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Max dimension capped at 2048px to maintain excellent OCR quality while reducing footprint
    const maxDimension = 2048;
    const shouldResize = (metadata.width && metadata.width > maxDimension) || (metadata.height && metadata.height > maxDimension);

    let pipeline = sharp(filePath);

    if (shouldResize) {
      pipeline = pipeline.resize({
        width: metadata.width > metadata.height ? maxDimension : undefined,
        height: metadata.height >= metadata.width ? maxDimension : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    if (ext === '.png') {
      // PNG compression
      await pipeline
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          quality: 80,
        })
        .toFile(tempOutputPath);
    } else {
      // JPEG / other formats
      await pipeline
        .jpeg({
          quality: 82,
          mozjpeg: true,
          progressive: true,
        })
        .toFile(tempOutputPath);
    }

    const newStat = fs.statSync(tempOutputPath);
    const newSize = newStat.size;

    // Replace original file with compressed version
    fs.copyFileSync(tempOutputPath, filePath);
    fs.unlinkSync(tempOutputPath);

    console.log(
      `[IMAGE COMPRESSION] Compressed ${originalFileName}: ` +
      `${(originalSize / (1024 * 1024)).toFixed(2)} MB -> ${(newSize / (1024 * 1024)).toFixed(2)} MB ` +
      `(${Math.round((1 - newSize / originalSize) * 100)}% reduction using Sharp)`
    );

    return {
      compressed: true,
      originalSize,
      newSize,
      size: newSize,
    };
  } catch (error) {
    console.error(`[IMAGE COMPRESSION ERROR] Failed to compress ${originalFileName}:`, error.message);
    if (fs.existsSync(tempOutputPath)) {
      try { fs.unlinkSync(tempOutputPath); } catch (_) {}
    }
    return { compressed: false, size: originalSize };
  }
}
