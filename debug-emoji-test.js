// Simple test for emoji encoding/decoding
// Test with a very basic example

import { emojisToBase64Public } from '../src/lib/emoji-encoder.js';

// Test with the first few emojis
const testEmojis = "😀😃😄"; // First 3 emojis which should represent bytes 0, 1, 2

console.log("Test emojis:", testEmojis);
console.log("Emoji array:", Array.from(testEmojis));

try {
  const base64Result = emojisToBase64Public(testEmojis);
  console.log("Base64 result:", base64Result);
  
  // Decode the base64 back to see what bytes we get
  const binary = atob(base64Result);
  const bytes = [];
  for (let i = 0; i < binary.length; i++) {
    bytes.push(binary.charCodeAt(i));
  }
  console.log("Decoded bytes:", bytes);
  
} catch (error) {
  console.error("Error in emoji conversion:", error);
}
