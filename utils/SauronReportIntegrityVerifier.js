/**
 * SauronReportIntegrityVerifier.js
 * Purpose: Verifies both signature and encryption integrity of scan report buffers
 * Dependencies: Node.js std lib (crypto)
 * API: SauronReportIntegrityVerifier(config).verify(encrypted, iv, authTag, expectedSignature) → object
 */

import crypto from 'crypto';

export class SauronReportIntegrityVerifier {
  constructor(config = {}) {
    this.algorithm = config.algorithm || 'sha256';
    this.encryptionAlgorithm = config.encryptionAlgorithm || 'aes-256-gcm';
    this.key = config.key;

    if (!this.key || !Buffer.isBuffer(this.key)) {
      throw new Error('SauronReportIntegrityVerifier requires a Buffer key');
    }

    // Validate key length for AES-256
    if (this.encryptionAlgorithm.includes('aes-256') && this.key.length !== 32) {
      throw new Error('AES-256 requires a 32-byte key');
    }

    this.maxDecryptedSize = config.maxDecryptedSize || 50 * 1024 * 1024; // 50MB default
  }

  /**
   * Verifies both encryption and signature integrity
   * @param {Buffer} encrypted - Encrypted report buffer
   * @param {Buffer} iv - Initialization vector
   * @param {Buffer} authTag - Authentication tag for GCM
   * @param {string} expectedSignature - Expected signature to verify against
   * @returns {Promise<object>} Verification result with decrypted data
   */
  async verify(encrypted, iv, authTag, expectedSignature) {
    const startTime = Date.now();
    const metadata = {
      verifiedAt: new Date().toISOString(),
      algorithm: this.algorithm,
      encryptionAlgorithm: this.encryptionAlgorithm,
      encryptedSize: encrypted ? encrypted.length : 0,
      duration: null
    };

    try {
      // Input validation
      if (!Buffer.isBuffer(encrypted)) {
        return this._createResult(false, false, null, 'Encrypted data must be a Buffer', metadata);
      }

      if (!Buffer.isBuffer(iv)) {
        return this._createResult(false, false, null, 'IV must be a Buffer', metadata);
      }

      if (!Buffer.isBuffer(authTag)) {
        return this._createResult(false, false, null, 'Auth tag must be a Buffer', metadata);
      }

      if (typeof expectedSignature !== 'string' || !expectedSignature) {
        return this._createResult(false, false, null, 'Expected signature must be a non-empty string', metadata);
      }

      // Step 1: Decrypt the buffer
      let decrypted;
      try {
        decrypted = this._decrypt(encrypted, iv, authTag);

        // Check decrypted size
        if (decrypted.length > this.maxDecryptedSize) {
          return this._createResult(false, false, null,
            `Decrypted size ${decrypted.length} exceeds max ${this.maxDecryptedSize}`, metadata);
        }

        metadata.decryptedSize = decrypted.length;
      } catch (err) {
        return this._createResult(false, false, null,
          `Decryption failed: ${err.message}`, metadata);
      }

      // Step 2: Parse decrypted JSON
      let reportData;
      try {
        const jsonStr = decrypted.toString('utf8');
        reportData = JSON.parse(jsonStr);
      } catch (err) {
        return this._createResult(false, false, null,
          `Invalid JSON in decrypted data: ${err.message}`, metadata);
      }

      // Step 3: Generate canonical signature
      const canonicalJson = this._toCanonicalJson(reportData);
      const hash = crypto.createHash(this.algorithm);
      hash.update(canonicalJson);
      const actualSignature = hash.digest('hex');

      // Step 4: Compare signatures
      const signatureMatch = actualSignature === expectedSignature;

      metadata.duration = Date.now() - startTime;

      // Log verification details


      return this._createResult(true, signatureMatch, decrypted,
        signatureMatch ? null : 'Signature mismatch', metadata);

    } catch (err) {
      metadata.duration = Date.now() - startTime;
      console.error('[SauronReportIntegrityVerifier] Verification error:', err);

      // Defensive fallback - return minimal safe object
      return this._createResult(false, false, null,
        `Verification error: ${err.message}`, metadata);
    }
  }

  /**
   * Decrypts the buffer using AES-GCM
   * @private
   */
  _decrypt(encrypted, iv, authTag) {
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    const chunks = [];
    chunks.push(decipher.update(encrypted));
    chunks.push(decipher.final());

    return Buffer.concat(chunks);
  }

  /**
   * Creates canonical JSON representation with sorted keys
   * @private
   */
  _toCanonicalJson(obj) {
    return JSON.stringify(this._sortKeys(obj));
  }

  /**
   * Recursively sorts object keys for deterministic output
   * @private
   */
  _sortKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this._sortKeys(item));
    }

    const sorted = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      sorted[key] = this._sortKeys(obj[key]);
    }

    return sorted;
  }

  /**
   * Creates standardized result object
   * @private
   */
  _createResult(verified, signatureMatch, decrypted, reason, metadata) {
    const result = {
      verified,
      signatureMatch,
      decrypted,
      metadata
    };

    if (reason) {
      result.reason = reason;
    }

    return result;
  }
}

// Module exports
export default SauronReportIntegrityVerifier;
