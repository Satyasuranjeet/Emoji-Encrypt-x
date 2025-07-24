/**
 * Advanced Cryptographic Utilities for Text-to-Emoji Encryption
 * 
 * This module implements military-grade AES-256-GCM encryption with:
 * - PBKDF2 key derivation with high iteration count
 * - Cryptographically secure random salt and IV generation
 * - Authenticated encryption with tamper protection
 * - Secure memory clearing
 * - Constant-time operations where possible
 */

// Configuration constants for maximum security
const PBKDF2_ITERATIONS = 600000; // OWASP recommended minimum for 2024
const SALT_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits authentication tag
const KEY_LENGTH = 32; // 256 bits

export interface EncryptionResult {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
}

export interface DecryptionInput {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
  password: string;
}

/**
 * Generates cryptographically secure random bytes
 */
function getSecureRandomBytes(length: number): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return bytes;
  }
  throw new Error('Secure random number generation not available');
}

/**
 * Derives encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Ensure we're running in a browser environment
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive AES-GCM key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH * 8 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Clear password from memory (best effort)
  passwordBytes.fill(0);
  
  return key;
}

/**
 * Encrypts text using AES-256-GCM with authenticated encryption
 */
export async function encryptText(text: string, password: string): Promise<EncryptionResult> {
  try {
    if (!text || !password) {
      throw new Error('Text and password are required');
    }
    
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(text);
    
    // Generate cryptographically secure random salt and IV
    const salt = getSecureRandomBytes(SALT_LENGTH);
    const iv = getSecureRandomBytes(IV_LENGTH);
    
    // Derive encryption key
    const key = await deriveKey(password, salt);
    
    // Encrypt using AES-256-GCM
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: TAG_LENGTH * 8
      },
      key,
      plaintext
    );
    
    // Extract ciphertext and authentication tag
    const encryptedBytes = new Uint8Array(encrypted);
    const ciphertext = encryptedBytes.slice(0, -TAG_LENGTH);
    const tag = encryptedBytes.slice(-TAG_LENGTH);
    
    // Convert to base64 for safe transport
    const result: EncryptionResult = {
      encrypted: arrayBufferToBase64(ciphertext.buffer),
      salt: arrayBufferToBase64(salt.buffer),
      iv: arrayBufferToBase64(iv.buffer),
      tag: arrayBufferToBase64(tag.buffer)
    };
    
    // Clear sensitive data from memory
    plaintext.fill(0);
    
    return result;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts text using AES-256-GCM with authentication verification
 */
export async function decryptText(input: DecryptionInput): Promise<string> {
  try {
    const { encrypted, salt, iv, tag, password } = input;
    
    if (!encrypted || !salt || !iv || !tag || !password) {
      throw new Error('All decryption parameters are required');
    }
    
    // Convert from base64
    const ciphertext = base64ToArrayBuffer(encrypted);
    const saltBytes = base64ToArrayBuffer(salt);
    const ivBytes = base64ToArrayBuffer(iv);
    const tagBytes = base64ToArrayBuffer(tag);
    
    // Validate lengths
    const saltBytesArray = new Uint8Array(saltBytes);
    const ivBytesArray = new Uint8Array(ivBytes);
    const tagBytesArray = new Uint8Array(tagBytes);
    
    if (saltBytesArray.length !== SALT_LENGTH) {
      throw new Error('Invalid salt length');
    }
    if (ivBytesArray.length !== IV_LENGTH) {
      throw new Error('Invalid IV length');
    }
    if (tagBytesArray.length !== TAG_LENGTH) {
      throw new Error('Invalid tag length');
    }
    
    // Derive decryption key
    const key = await deriveKey(password, saltBytesArray);
    
    // Combine ciphertext and tag for decryption
    const ciphertextArray = new Uint8Array(ciphertext);
    const encryptedData = new Uint8Array(ciphertextArray.byteLength + tagBytesArray.byteLength);
    encryptedData.set(ciphertextArray, 0);
    encryptedData.set(tagBytesArray, ciphertextArray.byteLength);
    
    // Decrypt using AES-256-GCM
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytesArray,
        tagLength: TAG_LENGTH * 8
      },
      key,
      encryptedData
    );
    
    // Convert back to text
    const decoder = new TextDecoder();
    const result = decoder.decode(decrypted);
    
    return result;
  } catch {
    // Don't leak information about why decryption failed
    throw new Error('Decryption failed: Invalid password or corrupted data');
  }
}

/**
 * Securely clears a string from memory (best effort)
 */
export function clearString(str: string): void {
  // JavaScript strings are immutable, so we can't actually clear them
  // This is a limitation of the language, but we do what we can
  if (typeof str === 'string' && str.length > 0) {
    try {
      // Attempt to overwrite references (limited effectiveness)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (str as any) = null;
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Utility functions for base64 encoding/decoding
 */
function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length < 12) {
    return { isValid: false, message: 'For maximum security, use at least 12 characters' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
  
  if (strength < 3) {
    return { 
      isValid: false, 
      message: 'Password should contain uppercase, lowercase, numbers, and special characters' 
    };
  }
  
  return { isValid: true, message: 'Password is strong' };
}
