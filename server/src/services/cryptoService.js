import crypto from 'crypto';
import fs from 'fs';
import { Document } from '../models/Document.js';

/**
 * Calculates SHA-256 hash of a file on disk
 */
export async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Checks if an active document with the same SHA-256 hash already exists for the company
 */
export async function findDuplicateDocument(sha256Hash, companyId) {
  const query = {
    sha256: sha256Hash,
    isDuplicate: false,
    supersededBy: null,
  };
  if (companyId) {
    query.companyId = companyId;
  }
  return Document.findOne(query).exec();
}
