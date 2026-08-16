/**
 * Native WebCrypto AES-256-GCM Cryptographic Engine
 * Zero external libraries; runs purely in browser/user space without triggering EDR/XDR anomalies.
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export class CryptoEngine {
  /**
   * Derive a 256-bit AES-GCM CryptoKey from a passphrase using PBKDF2
   */
  static async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt a plaintext string using AES-256-GCM
   */
  static async encrypt(plaintext: string, secretKeyOrPass: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(secretKeyOrPass, salt);

    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      key,
      encoded
    );

    const payload = {
      ct: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv.buffer),
      salt: arrayBufferToBase64(salt.buffer),
    };

    return btoa(JSON.stringify(payload));
  }

  /**
   * Decrypt a compact payload string using AES-256-GCM
   */
  static async decrypt(encodedPayload: string, secretKeyOrPass: string): Promise<string> {
    try {
      const decodedJson = atob(encodedPayload);
      const { ct, iv, salt } = JSON.parse(decodedJson);

      const ciphertextBuffer = base64ToArrayBuffer(ct);
      const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));
      const saltBuffer = new Uint8Array(base64ToArrayBuffer(salt));

      const key = await this.deriveKey(secretKeyOrPass, saltBuffer);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer as unknown as BufferSource,
        },
        key,
        ciphertextBuffer
      );

      return new TextDecoder().decode(decrypted);
    } catch {
      throw new Error('Decryption failed: Invalid passphrase or corrupted data.');
    }
  }

  /**
   * Generate a random secure room delegation key (URL-safe)
   */
  static generateRoomSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
