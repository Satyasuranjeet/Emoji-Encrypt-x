// Test the emoji encoding step by step
// Add this to your browser console after opening the app

function testEmojiEncoding() {
  console.log("=== Testing Emoji Encoding ===");
  
  // Test data
  const testData = {
    encrypted: "dGVzdA==", // "test" in base64
    salt: "c2FsdA==",      // "salt" in base64
    iv: "aXY=",            // "iv" in base64
    tag: "dGFn"            // "tag" in base64
  };
  
  console.log("1. Test data:", testData);
  
  // Convert to JSON
  const jsonString = JSON.stringify(testData);
  console.log("2. JSON string:", jsonString);
  console.log("3. JSON length:", jsonString.length);
  
  // Convert to base64
  const base64String = btoa(jsonString);
  console.log("4. Base64 string:", base64String);
  console.log("5. Base64 length:", base64String.length);
  
  // Test reverse process
  try {
    const decodedJson = atob(base64String);
    console.log("6. Decoded JSON:", decodedJson);
    
    const parsedData = JSON.parse(decodedJson);
    console.log("7. Parsed data:", parsedData);
    
    const matches = JSON.stringify(testData) === JSON.stringify(parsedData);
    console.log("8. Round trip successful:", matches);
    
    return base64String;
  } catch (error) {
    console.error("Error in reverse process:", error);
    return null;
  }
}

// Run the test
const result = testEmojiEncoding();
if (result) {
  console.log("Test passed! Base64 for emoji conversion:", result);
} else {
  console.log("Test failed!");
}
