# EncryptCT 🔐✨

A beautiful, secure text-to-emoji encryption web application that transforms your sensitive text into colorful emoji sequences using military-grade encryption.

## 🚀 Features

### 🔒 Military-Grade Security
- **AES-256-GCM encryption** - Industry standard authenticated encryption
- **PBKDF2 key derivation** with 600,000 iterations (OWASP 2024 recommended)
- **Cryptographically secure random number generation** for salts and IVs
- **Authenticated encryption** with tamper detection
- **Client-side only** - Your data never leaves your browser

### 🎨 Beautiful UI/UX
- **Smooth animations** powered by Framer Motion
- **Modern glass-morphism design** with backdrop blur effects
- **Responsive layout** that works on all devices
- **Real-time password strength indicator**
- **Animated background particles** for visual appeal
- **Accessibility-first** design principles

### 🔤 Emoji Encoding System
- Converts encrypted binary data into 256 unique emojis
- **Visually appealing** representation of encrypted data
- **Information-theoretically secure** - no data leakage through emoji patterns
- **Reversible without loss** - perfect reconstruction
- **Unicode-safe** encoding and decoding

### 💪 Advanced Features
- **File upload/download** support for text files
- **Copy to clipboard** functionality
- **Password validation** with entropy calculation
- **Real-time encryption statistics**
- **Error handling** with user-friendly messages
- **Memory clearing** (best effort) for sensitive data

## 🛡️ Security Architecture

### Encryption Process
1. **Password Validation** - Ensures strong password policies
2. **Salt Generation** - 256-bit cryptographically secure random salt
3. **Key Derivation** - PBKDF2 with SHA-256 and 600K iterations
4. **AES-256-GCM Encryption** - Authenticated encryption with 128-bit tag
5. **Emoji Encoding** - Binary-to-emoji conversion using 256-emoji alphabet
6. **Formatting** - Grouped display for better readability

### Decryption Process
1. **Emoji Parsing** - Convert formatted emojis back to binary
2. **Data Reconstruction** - Rebuild encryption components
3. **Authentication** - Verify data integrity using GCM tag
4. **Key Derivation** - Same PBKDF2 process with provided password
5. **AES-256-GCM Decryption** - Authenticated decryption
6. **Text Recovery** - UTF-8 decoding of plaintext

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd encryptct
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 Usage

### Encryption
1. Select "Encrypt" mode
2. Enter your secret text in the input area
3. Create a strong password (12+ characters recommended)
4. Confirm your password
5. Click "Encrypt to Emojis"
6. Copy or download the emoji-encoded result

### Decryption
1. Select "Decrypt" mode
2. Paste or upload your emoji-encoded text
3. Enter the same password used for encryption
4. Click "Decrypt from Emojis"
5. Your original text will be recovered

## 🏗️ Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Cryptography**: Web Crypto API
- **Build Tool**: Next.js with Turbopack support

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main application component
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── lib/
│   ├── crypto.ts         # Encryption/decryption utilities
│   ├── emoji-encoder.ts  # Emoji encoding system
│   └── utils.ts          # Utility functions
└── components/           # Reusable components (future)
```

## 🔐 Security Considerations

### What We Protect Against
- **Password cracking** - High iteration PBKDF2
- **Data tampering** - Authenticated encryption (GCM)
- **Brute force attacks** - Strong password requirements
- **Side-channel attacks** - Constant-time operations where possible
- **Data exfiltration** - Client-side only processing

### Limitations
- **JavaScript memory management** - Cannot completely clear sensitive data
- **Browser security** - Dependent on browser's crypto implementation
- **Physical access** - Cannot protect against local device compromise
- **Quantum threats** - AES-256 is quantum-resistant but not quantum-proof

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and ensure all security-related changes are thoroughly reviewed.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This application is designed for educational and personal use. While it implements strong encryption standards, always use additional security measures for highly sensitive data. The developers are not responsible for any data loss or security breaches.

## 🔮 Future Enhancements

- [ ] Multiple encryption algorithms support
- [ ] Bulk file processing
- [ ] Password manager integration
- [ ] Mobile app version
- [ ] Offline PWA functionality
- [ ] Advanced emoji customization
- [ ] Enterprise security features

---

**Remember**: The security of your data is only as strong as your password. Use long, unique passwords and store them securely! 🔐
