'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Shield, Eye, EyeOff, Copy, Download, Upload, Sparkles, Key, Zap } from 'lucide-react';
import { encryptText, decryptText, validatePassword, type EncryptionResult } from '@/lib/crypto';
import { encodeToEmojis, formatEmojisForDisplay, unformatEmojis, getEmojiStats, emojisToBase64Public } from '@/lib/emoji-encoder';
import { copyToClipboard, downloadAsFile, readFileAsText, debounce, calculatePasswordEntropy } from '@/lib/utils';

// Generate static particle positions to avoid hydration mismatch
const generateParticlePositions = () => {
  const positions = [];
  for (let i = 0; i < 50; i++) {
    positions.push({
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 10,
    });
  }
  return positions;
};

export default function Home() {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [inputText, setInputText] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ isValid: false, message: '', entropy: 0 });
  const [emojiStats, setEmojiStats] = useState<{
    totalEmojis: number;
    uniqueEmojis: number;
    compressionRatio: number;
    estimatedBytes: number;
    visualLength: number;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [particlePositions] = useState(() => generateParticlePositions());

  // Set client flag after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debounced password validation
  const validatePasswordDebounced = useMemo(() => 
    debounce((pwd: string) => {
      if (pwd) {
        const validation = validatePassword(pwd);
        const entropy = calculatePasswordEntropy(pwd);
        setPasswordStrength({ ...validation, entropy });
      } else {
        setPasswordStrength({ isValid: false, message: '', entropy: 0 });
      }
    }, 300),
    [setPasswordStrength]
  );

  useEffect(() => {
    validatePasswordDebounced(password);
  }, [password, validatePasswordDebounced]);

  const handleModeChange = (newMode: 'encrypt' | 'decrypt') => {
    setMode(newMode);
    setInputText('');
    setResult('');
    setError('');
    setSuccess('');
    setEmojiStats(null);
  };

  const handleEncrypt = async () => {
    if (!inputText.trim()) {
      setError('Please enter text to encrypt');
      return;
    }

    if (!password) {
      setError('Please enter a password');
      return;
    }

    if (mode === 'encrypt' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordStrength.isValid) {
      setError(passwordStrength.message);
      return;
    }

    // Check if crypto is available
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      setError('Encryption not available: This app requires a secure context (HTTPS)');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const encryptionResult = await encryptText(inputText, password);
      const emojiData = encodeToEmojis(encryptionResult);
      const formattedEmojis = formatEmojisForDisplay(emojiData.emojis, 12);
      
      setResult(formattedEmojis);
      setEmojiStats(getEmojiStats(emojiData.emojis));
      setSuccess('Text encrypted successfully! 🔐');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecrypt = async () => {
    if (!result.trim()) {
      setError('Please enter emoji code to decrypt');
      return;
    }

    if (!password) {
      setError('Please enter the decryption password');
      return;
    }

    // Check if crypto is available
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      setError('Decryption not available: This app requires a secure context (HTTPS)');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const unformattedEmojis = unformatEmojis(result);
      
      // Try to decode the emojis back to the original encryption result
      // We need to bypass the metadata since we only have the emoji string
      const combinedBase64 = emojisToBase64Public(unformattedEmojis);
      const combinedData = atob(combinedBase64);
      
      // Validate that the data looks like valid JSON
      let encryptionResult: EncryptionResult;
      try {
        encryptionResult = JSON.parse(combinedData);
      } catch {
        throw new Error('Invalid emoji format - corrupted data');
      }
      
      // Validate structure
      if (!encryptionResult.encrypted || !encryptionResult.salt || 
          !encryptionResult.iv || !encryptionResult.tag) {
        throw new Error('Invalid encryption data structure');
      }

      const decryptedText = await decryptText({
        ...encryptionResult,
        password
      });

      setInputText(decryptedText);
      setSuccess('Text decrypted successfully! 🔓');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Invalid password')) {
        setError('Decryption failed: Invalid password');
      } else if (errorMessage.includes('Invalid emoji') || errorMessage.includes('corrupted')) {
        setError('Decryption failed: Invalid or corrupted emoji data');
      } else {
        setError('Decryption failed: Invalid password or corrupted data');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy = mode === 'encrypt' ? result : inputText;
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setSuccess('Copied to clipboard! 📋');
    } else {
      setError('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    const content = mode === 'encrypt' ? result : inputText;
    const filename = mode === 'encrypt' ? 'encrypted-emojis.txt' : 'decrypted-text.txt';
    downloadAsFile(content, filename);
    setSuccess('File downloaded! 💾');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      if (mode === 'encrypt') {
        setInputText(content);
      } else {
        setResult(content);
      }
      setSuccess('File loaded successfully! 📁');
    } catch {
      setError('Failed to read file');
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.entropy > 60) return 'text-green-500';
    if (passwordStrength.entropy > 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Animated background particles - only render on client */}
      {isClient && (
        <div className="absolute inset-0 overflow-hidden">
          {particlePositions.map((particle, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/10 rounded-full"
              animate={{
                x: [0, (Math.sin(i * 0.5) * 50)],
                y: [0, (Math.cos(i * 0.3) * 50)],
                opacity: [0.1, 0.5, 0.1],
              }}
              transition={{
                duration: 15 + (i % 10),
                repeat: Infinity,
                ease: "linear",
                delay: particle.animationDelay,
              }}
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center gap-2 mb-4"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Shield size={48} className="text-cyan-400" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              EncryptCT
            </h1>
            <Sparkles size={48} className="text-purple-400" />
          </motion.div>
          <p className="text-xl text-gray-300">
            Military-grade text encryption with beautiful emoji encoding
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-400">
            <Zap size={16} />
            <span>AES-256-GCM • PBKDF2 • 600K iterations</span>
          </div>
        </motion.div>

        {/* Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20">
            <div className="flex">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModeChange('encrypt')}
                className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 ${
                  mode === 'encrypt'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Lock size={20} />
                Encrypt
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModeChange('decrypt')}
                className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 ${
                  mode === 'decrypt'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Unlock size={20} />
                Decrypt
              </motion.button>
            </div>
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="space-y-6"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  {mode === 'encrypt' ? <Lock size={24} /> : <Unlock size={24} />}
                  {mode === 'encrypt' ? 'Text to Encrypt' : 'Decrypted Text'}
                </h2>
                
                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={mode === 'encrypt' ? 'Enter your secret message...' : 'Decrypted text will appear here...'}
                    className="w-full h-40 bg-black/20 border border-white/30 rounded-xl p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300"
                    readOnly={mode === 'decrypt'}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                    {inputText.length} characters
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <motion.label
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    htmlFor="file-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-all duration-300"
                  >
                    <Upload size={16} />
                    Upload File
                  </motion.label>
                </div>
              </div>

              {/* Password Section */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Key size={20} />
                  Password
                </h3>
                
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter encryption password..."
                      className="w-full bg-black/20 border border-white/30 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {mode === 'encrypt' && (
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password..."
                        className="w-full bg-black/20 border border-white/30 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300"
                      />
                    </div>
                  )}

                  {/* Password Strength Indicator */}
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className={getPasswordStrengthColor()}>
                          {passwordStrength.message || `Entropy: ${passwordStrength.entropy.toFixed(1)} bits`}
                        </span>
                        {passwordStrength.isValid && <span className="text-green-400">✓</span>}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.entropy > 60 ? 'bg-green-500' :
                            passwordStrength.entropy > 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, (passwordStrength.entropy / 80) * 100)}%` }}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
                disabled={isProcessing}
                className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all duration-300 ${
                  mode === 'encrypt'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                } disabled:opacity-50 disabled:cursor-not-allowed shadow-xl`}
              >
                {isProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Shield size={20} />
                  </motion.div>
                ) : mode === 'encrypt' ? (
                  <>
                    <Lock size={20} />
                    Encrypt to Emojis
                  </>
                ) : (
                  <>
                    <Unlock size={20} />
                    Decrypt from Emojis
                  </>
                )}
              </motion.button>
            </motion.div>

            {/* Result Section */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-6"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Sparkles size={24} />
                  {mode === 'encrypt' ? 'Encrypted Emojis' : 'Emoji Code Input'}
                </h2>
                
                <div className="relative">
                  <textarea
                    value={result}
                    onChange={mode === 'decrypt' ? (e) => setResult(e.target.value) : undefined}
                    placeholder={mode === 'encrypt' ? 'Encrypted emojis will appear here...' : 'Paste your emoji code here...'}
                    className="w-full h-40 bg-black/20 border border-white/30 rounded-xl p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-300 text-2xl leading-relaxed"
                    readOnly={mode === 'encrypt'}
                  />
                </div>

                {/* Emoji Stats */}
                {emojiStats && mode === 'encrypt' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-black/20 rounded-lg"
                  >
                    <h4 className="font-semibold mb-2">Encryption Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                      <div>Total Emojis: {emojiStats.totalEmojis}</div>
                      <div>Unique Emojis: {emojiStats.uniqueEmojis}</div>
                      <div>Data Size: {emojiStats.estimatedBytes} bytes</div>
                      <div>Compression: {(emojiStats.compressionRatio * 100).toFixed(1)}%</div>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                {result && (
                  <div className="flex gap-2 mt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300"
                    >
                      <Copy size={16} />
                      Copy
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300"
                    >
                      <Download size={16} />
                      Download
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 right-6 max-w-md"
            >
              <div
                className={`p-4 rounded-xl shadow-2xl backdrop-blur-md border ${
                  error
                    ? 'bg-red-500/20 border-red-500/50 text-red-100'
                    : 'bg-green-500/20 border-green-500/50 text-green-100'
                }`}
              >
                {error || success}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <Shield size={16} />
            <span className="text-sm text-gray-300">
              Your data never leaves your browser • Client-side encryption only
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
