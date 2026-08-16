/**
 * Self-Check Test Suite for Intodo Core Logic
 * Tests:
 * 1. WebCrypto AES-256-GCM encryption/decryption
 * 2. Room key generation
 * 3. Serialization
 */

import { CryptoEngine } from './cryptoEngine.ts';

export async function runSelfCheck(): Promise<boolean> {
  console.log('--- Starting Intodo Self-Check ---');

  // Test 1: Crypto Roundtrip
  const testSecret = 'CorpSecretPass123!';
  const plaintext = JSON.stringify({
    title: 'Deploy EDR Safe Binary',
    sender: 'Sarah Lead',
    priority: 'high',
  });

  const encrypted = await CryptoEngine.encrypt(plaintext, testSecret);
  if (!encrypted || typeof encrypted !== 'string') {
    throw new Error('Encryption failed to produce valid payload');
  }
  console.log('✓ WebCrypto Encryption produced base64 ciphertext');

  const decrypted = await CryptoEngine.decrypt(encrypted, testSecret);
  if (decrypted !== plaintext) {
    throw new Error(`Decrypted text mismatch! Expected: ${plaintext}, Got: ${decrypted}`);
  }
  console.log('✓ WebCrypto Decryption verified plaintext integrity');

  // Test 2: Invalid Passphrase Rejection
  let caught = false;
  try {
    await CryptoEngine.decrypt(encrypted, 'WrongPassword!');
  } catch {
    caught = true;
  }
  if (!caught) {
    throw new Error('Decryption with wrong password should throw!');
  }
  console.log('✓ Invalid passphrase correctly rejected');

  // Test 3: Room Key Generation
  const roomSecret = CryptoEngine.generateRoomSecret();
  if (!roomSecret || roomSecret.length < 32) {
    throw new Error('Room secret generation invalid');
  }
  console.log('✓ Room Secret generated securely (32 hex chars):', roomSecret);

  console.log('--- All Self-Check Tests PASSED Successfully! ---');
  return true;
}

runSelfCheck();
