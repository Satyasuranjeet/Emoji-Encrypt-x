// Debug test for the encryption/decryption process
// Run this in the browser console to test our functions

// Test the basic emoji encoding/decoding
const testString = "Hello World!";
console.log("Original string:", testString);

// Convert to base64
const base64 = btoa(testString);
console.log("Base64:", base64);

// Convert back from base64
const decoded = atob(base64);
console.log("Decoded:", decoded);
console.log("Match:", testString === decoded);

// Test JSON serialization
const testObj = {
  encrypted: "test_encrypted_data",
  salt: "test_salt",
  iv: "test_iv",
  tag: "test_tag"
};

const jsonString = JSON.stringify(testObj);
console.log("JSON string:", jsonString);

const jsonBase64 = btoa(jsonString);
console.log("JSON as base64:", jsonBase64);

const decodedJson = atob(jsonBase64);
console.log("Decoded JSON:", decodedJson);

const parsedObj = JSON.parse(decodedJson);
console.log("Parsed object:", parsedObj);
console.log("Objects match:", JSON.stringify(testObj) === JSON.stringify(parsedObj));
