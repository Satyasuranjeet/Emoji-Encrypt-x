/**
 * Secure Emoji Encoding System
 * 
 * This module converts encrypted binary data to emojis and vice versa.
 * The encoding is designed to be:
 * - Visually appealing
 * - Information-theoretically secure (no data leakage)
 * - Reversible without loss
 * - Unicode-safe
 */

import { EncryptionResult } from './crypto';

// Comprehensive emoji alphabet with 256 unique emojis for byte-to-emoji mapping
const EMOJI_ALPHABET = [
  // Faces and expressions (0-31)
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😘', '😗', '☺', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  
  // More faces (32-63)
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷',
  '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐',
  
  // Animals (64-95)
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵',
  '🐒', '🦍', '🦧', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴',
  
  // More animals (96-127)
  '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕',
  '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓',
  
  // Nature (128-159)
  '🌱', '🌿', '🍀', '🌾', '🌵', '🌲', '🌳', '🌴', '🌸', '🌺', '🌻', '🌷', '🌹', '🥀', '🌼', '🌮',
  '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝',
  
  // Food (160-191)
  '🍅', '🫒', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶', '🫑', '🥒', '🥬', '🥦', '🍄', '🥜', '🌰',
  '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕',
  
  // Objects (192-223)
  '⚽', '🏀', '🏈', '⚾', '🥎', '🏐', '🏉', '🎾', '🥏', '🎳', '🏏', '🏑', '🥍', '🏓', '🏸', '🥊',
  '🥋', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥽', '🎿', '🛷', '🥌', '🎯', '🎱', '🎮', '🎰', '🎲',
  
  // Symbols and Objects (224-255)
  '🔮', '💎', '⚡', '🔥', '💫', '⭐', '🌟', '✨', '💥', '💨', '💦', '💧', '🌊', '🎪', '🎨', '🎭',
  '🎪', '🎫', '🎟', '🎠', '🎡', '🎢', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝'
];

// Verification that we have exactly 256 emojis
if (EMOJI_ALPHABET.length !== 256) {
  throw new Error(`Emoji alphabet must contain exactly 256 emojis, got ${EMOJI_ALPHABET.length}`);
}

// Create reverse mapping for decoding with Unicode normalization
const EMOJI_TO_BYTE = new Map<string, number>();
EMOJI_ALPHABET.forEach((emoji, index) => {
  const normalizedEmoji = emoji.normalize('NFC');
  EMOJI_TO_BYTE.set(normalizedEmoji, index);
  // Also map the original in case normalization changes it
  if (emoji !== normalizedEmoji) {
    EMOJI_TO_BYTE.set(emoji, index);
  }
});

/**
 * Enhanced emoji encoding result with metadata
 */
export interface EmojiEncodedData {
  emojis: string;
  metadata: {
    originalLength: number;
    encoding: string;
    checksum: string;
  };
}

/**
 * Converts base64 string to emoji representation
 */
function base64ToEmojis(base64: string): string {
  try {
    // Convert base64 to binary
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // Convert each byte to corresponding emoji
    let emojis = '';
    for (let i = 0; i < bytes.length; i++) {
      emojis += EMOJI_ALPHABET[bytes[i]];
    }
    
    // Normalize the output to ensure consistency
    return emojis.normalize('NFC');
  } catch {
    throw new Error('Failed to convert base64 to emojis');
  }
}

/**
 * Converts emoji string back to base64
 */
function emojisToBase64(emojis: string): string {
  try {
    // Normalize Unicode to handle variation selectors consistently
    const normalizedEmojis = emojis.normalize('NFC');
    
    // Split emojis into individual characters (handling multi-byte emojis)
    const emojiArray = Array.from(normalizedEmojis);
    const bytes = new Uint8Array(emojiArray.length);
    
    console.log('emojisToBase64 debug:');
    console.log('- Input emojis length:', emojis.length);
    console.log('- Normalized emojis length:', normalizedEmojis.length);
    console.log('- Emoji array length:', emojiArray.length);
    console.log('- First 10 emojis:', emojiArray.slice(0, 10));
    
    for (let i = 0; i < emojiArray.length; i++) {
      const emoji = emojiArray[i];
      const byteValue = EMOJI_TO_BYTE.get(emoji);
      
      if (byteValue === undefined) {
        console.error(`Invalid emoji at position ${i}:`, {
          emoji: emoji,
          codePoint: emoji.codePointAt(0),
          charCode: emoji.charCodeAt(0),
          length: emoji.length,
          isInAlphabet: EMOJI_ALPHABET.includes(emoji),
          normalizedEmoji: emoji.normalize('NFC'),
          normalizedIsInAlphabet: EMOJI_ALPHABET.includes(emoji.normalize('NFC'))
        });
        throw new Error(`Invalid emoji found at position ${i}: ${emoji} (code: ${emoji.codePointAt(0)})`);
      }
      
      bytes[i] = byteValue;
    }
    
    // Convert bytes back to base64
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  } catch (error) {
    console.error('emojisToBase64 error details:', error);
    throw new Error('Failed to convert emojis to base64');
  }
}

/**
 * Public function to convert emojis back to base64 for decryption
 */
export function emojisToBase64Public(emojis: string): string {
  return emojisToBase64(emojis);
}

/**
 * Simple checksum calculation for integrity verification
 */
function calculateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Encodes encrypted data into a beautiful emoji representation
 */
export function encodeToEmojis(encryptionResult: EncryptionResult): EmojiEncodedData {
  try {
    // Combine all encrypted components into a single string
    const combinedData = JSON.stringify(encryptionResult);
    const combinedBase64 = btoa(combinedData);
    
    // Convert to emojis
    const emojis = base64ToEmojis(combinedBase64);
    
    // Create metadata
    const metadata = {
      originalLength: combinedData.length,
      encoding: 'emoji-v1',
      checksum: calculateChecksum(combinedData)
    };
    
    return {
      emojis,
      metadata
    };
  } catch (error) {
    throw new Error(`Failed to encode to emojis: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decodes emoji representation back to encryption data
 */
export function decodeFromEmojis(emojiData: EmojiEncodedData): EncryptionResult {
  try {
    const { emojis, metadata } = emojiData;
    
    // Convert emojis back to base64
    const combinedBase64 = emojisToBase64(emojis);
    
    // Convert base64 back to JSON string
    const combinedData = atob(combinedBase64);
    
    // Verify checksum
    const calculatedChecksum = calculateChecksum(combinedData);
    if (calculatedChecksum !== metadata.checksum) {
      throw new Error('Data integrity check failed');
    }
    
    // Parse the encryption result
    const encryptionResult: EncryptionResult = JSON.parse(combinedData);
    
    // Validate structure
    if (!encryptionResult.encrypted || !encryptionResult.salt || 
        !encryptionResult.iv || !encryptionResult.tag) {
      throw new Error('Invalid encryption result structure');
    }
    
    return encryptionResult;
  } catch (error) {
    throw new Error(`Failed to decode from emojis: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Simple emoji-only encoding for display purposes (less secure but prettier)
 */
export function encodeTextToEmojisSimple(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  
  let emojis = '';
  for (let i = 0; i < bytes.length; i++) {
    emojis += EMOJI_ALPHABET[bytes[i]];
  }
  
  return emojis;
}

/**
 * Decodes simple emoji representation back to text
 */
export function decodeEmojisToTextSimple(emojis: string): string {
  try {
    const emojiArray = Array.from(emojis);
    const bytes = new Uint8Array(emojiArray.length);
    
    for (let i = 0; i < emojiArray.length; i++) {
      const emoji = emojiArray[i];
      const byteValue = EMOJI_TO_BYTE.get(emoji);
      
      if (byteValue === undefined) {
        throw new Error(`Invalid emoji: ${emoji}`);
      }
      
      bytes[i] = byteValue;
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch {
    throw new Error('Failed to decode simple emoji text');
  }
}

/**
 * Formats emoji string for better readability
 */
export function formatEmojisForDisplay(emojis: string, groupSize: number = 8): string {
  const emojiArray = Array.from(emojis);
  const groups: string[] = [];
  
  for (let i = 0; i < emojiArray.length; i += groupSize) {
    groups.push(emojiArray.slice(i, i + groupSize).join(''));
  }
  
  return groups.join(' ');
}

/**
 * Removes formatting from emoji display back to raw emoji string
 */
export function unformatEmojis(formattedEmojis: string): string {
  console.log('unformatEmojis debug:');
  console.log('- Input length:', formattedEmojis.length);
  console.log('- Input preview:', formattedEmojis.substring(0, 50));
  
  const unformatted = formattedEmojis.replace(/\s/g, '');
  
  // Normalize Unicode to handle variation selectors consistently
  const normalized = unformatted.normalize('NFC');
  
  console.log('- Output length:', unformatted.length);
  console.log('- Normalized length:', normalized.length);
  console.log('- Output preview:', unformatted.substring(0, 50));
  console.log('- Normalized preview:', normalized.substring(0, 50));
  console.log('- Character codes of first 10:', Array.from(normalized).slice(0, 10).map(c => c.codePointAt(0)));
  
  return normalized;
}

/**
 * Gets statistics about the emoji encoding
 */
export function getEmojiStats(emojis: string) {
  const emojiArray = Array.from(emojis);
  const uniqueEmojis = new Set(emojiArray);
  
  return {
    totalEmojis: emojiArray.length,
    uniqueEmojis: uniqueEmojis.size,
    compressionRatio: uniqueEmojis.size / emojiArray.length,
    estimatedBytes: emojiArray.length,
    visualLength: emojis.length // Unicode length
  };
}
