'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Shield, Eye, EyeOff, Copy, Download, Upload, Sparkles, Key, Zap } from 'lucide-react';
import { encryptText, decryptText, type EncryptionResult } from '@/lib/crypto';
import { encodeToEmojis, formatEmojisForDisplay, unformatEmojis, getEmojiStats, emojisToBase64Public } from '@/lib/emoji-encoder';
import { copyToClipboard, downloadAsFile, readFileAsText } from '@/lib/utils';

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

    // Check if crypto is available
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      setError('Encryption not available: This app requires a secure context (HTTPS)');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      console.log('=== ENCRYPTION DEBUG ===');
      console.log('1. Input text:', inputText);
      console.log('2. Password length:', password.length);
      
      const encryptionResult = await encryptText(inputText, password);
      console.log('3. Encryption result keys:', Object.keys(encryptionResult));
      console.log('4. Encryption result preview:', {
        encrypted: encryptionResult.encrypted.substring(0, 50) + '...',
        salt: encryptionResult.salt,
        iv: encryptionResult.iv,
        tag: encryptionResult.tag
      });
      
      const emojiData = encodeToEmojis(encryptionResult);
      console.log('5. Emoji data:', {
        emojisLength: emojiData.emojis.length,
        metadata: emojiData.metadata,
        firstEmojis: Array.from(emojiData.emojis).slice(0, 10)
      });
      
      const formattedEmojis = formatEmojisForDisplay(emojiData.emojis, 12);
      console.log('6. Formatted emojis length:', formattedEmojis.length);
      console.log('7. First 100 chars of formatted:', formattedEmojis.substring(0, 100));
      
      setResult(formattedEmojis);
      setEmojiStats(getEmojiStats(emojiData.emojis));
      setSuccess('Text encrypted successfully! 🔐');
    } catch (err) {
      console.error('Encryption error:', err);
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
      console.log('=== DECRYPTION DEBUG ===');
      console.log('1. Raw result input:', result);
      
      const unformattedEmojis = unformatEmojis(result);
      console.log('2. Unformatted emojis:', unformattedEmojis);
      console.log('3. Unformatted emojis length:', unformattedEmojis.length);
      console.log('4. First 10 emoji chars:', Array.from(unformattedEmojis).slice(0, 10));
      
      // Try to decode the emojis back to the original encryption result
      let combinedBase64: string;
      try {
        combinedBase64 = emojisToBase64Public(unformattedEmojis);
        console.log('5. Combined base64:', combinedBase64);
        console.log('6. Base64 length:', combinedBase64.length);
      } catch (err) {
        console.error('ERROR at step 5 - converting emojis to base64:', err);
        throw new Error('Invalid emoji format - failed to convert to base64');
      }
      
      let combinedData: string;
      try {
        combinedData = atob(combinedBase64);
        console.log('7. Combined data length:', combinedData.length);
        console.log('8. Combined data preview:', combinedData.substring(0, 200));
      } catch (err) {
        console.error('ERROR at step 7 - decoding base64:', err);
        throw new Error('Invalid base64 data');
      }
      
      // Validate that the data looks like valid JSON
      let encryptionResult: EncryptionResult;
      try {
        encryptionResult = JSON.parse(combinedData);
        console.log('9. Parsed encryption result keys:', Object.keys(encryptionResult));
        console.log('10. Encryption result structure check:', {
          hasEncrypted: !!encryptionResult.encrypted,
          hasSalt: !!encryptionResult.salt,
          hasIv: !!encryptionResult.iv,
          hasTag: !!encryptionResult.tag
        });
      } catch (err) {
        console.error('ERROR at step 9 - parsing JSON:', err);
        console.error('Raw data that failed to parse:', combinedData);
        throw new Error('Invalid emoji format - corrupted data');
      }
      
      // Validate structure
      if (!encryptionResult.encrypted || !encryptionResult.salt || 
          !encryptionResult.iv || !encryptionResult.tag) {
        console.error('ERROR: Invalid structure:', encryptionResult);
        throw new Error('Invalid encryption data structure');
      }

      console.log('11. Attempting decryption...');
      const decryptedText = await decryptText({
        ...encryptionResult,
        password
      });
      console.log('12. Decryption successful!');

      setInputText(decryptedText);
      setSuccess('Text decrypted successfully! 🔓');
    } catch (err) {
      console.error('FINAL ERROR:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Invalid password') || errorMessage.includes('Decryption failed')) {
        setError('Decryption failed: Invalid password');
      } else if (errorMessage.includes('Invalid emoji') || errorMessage.includes('corrupted') || errorMessage.includes('base64')) {
        setError('Decryption failed: Invalid or corrupted emoji data');
      } else {
        setError(`Decryption failed: ${errorMessage}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Animated background particles - only render on client */}
      {isClient && (
        <div className="absolute inset-0 overflow-hidden">
          {particlePositions.map((particle, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
              animate={{
                x: [0, (Math.sin(i * 0.5) * 40)],
                y: [0, (Math.cos(i * 0.3) * 40)],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 25 + (i % 15),
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

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 sm:mb-12"
        >
          <motion.div
            className="inline-flex items-center gap-3 mb-6"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            >
              <Shield size={40} className="text-purple-400 sm:w-14 sm:h-14" />
            </motion.div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              EncryptCT
            </h1>
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Sparkles size={40} className="text-pink-400 sm:w-14 sm:h-14" />
            </motion.div>
          </motion.div>
          <p className="text-xl sm:text-2xl text-gray-300 mb-3">
            Military-grade text encryption with beautiful emoji encoding
          </p>
          <div className="flex items-center justify-center gap-3 mt-2 text-sm sm:text-base text-purple-300/80">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap size={16} className="sm:w-5 sm:h-5" />
            </motion.div>
            <span>AES-256-GCM • PBKDF2 • 600K iterations</span>
          </div>
        </motion.div>

        {/* Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center mb-6 sm:mb-8"
        >
          <div className="bg-slate-800/30 backdrop-blur-lg rounded-2xl p-1.5 border border-purple-500/30 shadow-2xl shadow-purple-500/10">
            <div className="flex relative">
              <motion.div
                className="absolute inset-0 rounded-xl bg-gradient-to-r opacity-20"
                animate={{
                  background: mode === 'encrypt' 
                    ? ["linear-gradient(90deg, #06b6d4, #3b82f6)", "linear-gradient(90deg, #3b82f6, #06b6d4)"]
                    : ["linear-gradient(90deg, #a855f7, #ec4899)", "linear-gradient(90deg, #ec4899, #a855f7)"]
                }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleModeChange('encrypt')}
                className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl flex items-center gap-3 transition-all duration-500 text-sm sm:text-base font-medium relative z-10 ${
                  mode === 'encrypt'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <motion.div
                  animate={{ rotate: mode === 'encrypt' ? [0, 360] : 0 }}
                  transition={{ duration: 2, repeat: mode === 'encrypt' ? Infinity : 0, ease: "linear" }}
                >
                  <Lock size={18} className="sm:w-5 sm:h-5" />
                </motion.div>
                Encrypt
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleModeChange('decrypt')}
                className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl flex items-center gap-3 transition-all duration-500 text-sm sm:text-base font-medium relative z-10 ${
                  mode === 'decrypt'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-xl shadow-purple-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <motion.div
                  animate={{ rotate: mode === 'decrypt' ? [0, -360] : 0 }}
                  transition={{ duration: 2, repeat: mode === 'decrypt' ? Infinity : 0, ease: "linear" }}
                >
                  <Unlock size={18} className="sm:w-5 sm:h-5" />
                </motion.div>
                Decrypt
              </motion.button>
            </div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto">
          {/* Main Content Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-8">
            {/* Left Section - Changes based on mode */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <div className="relative bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-purple-500/20 shadow-2xl shadow-purple-500/5 hover:shadow-purple-500/10 transition-all duration-500">
                {/* Animated border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />
                
                <motion.h2 
                  className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: mode === 'encrypt' ? [0, 5, -5, 0] : [0, -5, 5, 0]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {mode === 'encrypt' ? <Lock size={24} className="sm:w-7 sm:h-7" /> : <Sparkles size={24} className="sm:w-7 sm:h-7" />}
                  </motion.div>
                  {mode === 'encrypt' ? 'Text to Encrypt' : 'Emoji Code Input'}
                </motion.h2>
                
                <div className="relative group/textarea">
                  <motion.textarea
                    value={mode === 'encrypt' ? inputText : result}
                    onChange={mode === 'encrypt' ? (e) => setInputText(e.target.value) : (e) => setResult(e.target.value)}
                    placeholder={mode === 'encrypt' ? 'Enter your secret message...' : 'Paste your emoji code here...'}
                    className={`w-full h-40 sm:h-48 bg-slate-900/60 border-2 border-slate-600/50 rounded-2xl p-6 text-white placeholder-slate-400 resize-none focus:outline-none focus:border-purple-500/60 focus:bg-slate-900/80 transition-all duration-300 leading-relaxed ${
                      mode === 'encrypt' ? 'text-lg' : 'text-2xl sm:text-3xl'
                    }`}
                    whileFocus={{ scale: 1.02 }}
                  />
                  <motion.div 
                    className="absolute bottom-3 right-3 px-3 py-1 bg-slate-700/60 rounded-lg text-xs text-slate-300"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {mode === 'encrypt' ? `${inputText.length} characters` : `${result.length} characters`}
                  </motion.div>
                  
                  {/* Animated border on focus */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 opacity-0 group-focus-within/textarea:opacity-20 transition-opacity duration-300 -z-10 blur-sm" />
                </div>

                {/* Upload button */}
                <div className="flex gap-3 mt-6">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={mode === 'encrypt' ? handleFileUpload : (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      readFileAsText(file).then(content => {
                        setResult(content);
                        setSuccess('Emoji file loaded successfully! 📁');
                      }).catch(() => setError('Failed to read emoji file'));
                    }}
                    className="hidden"
                    id="left-file-upload"
                  />
                  <motion.label
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    htmlFor="left-file-upload"
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 hover:from-slate-600/60 hover:to-slate-500/60 rounded-xl cursor-pointer transition-all duration-300 text-sm font-medium border border-slate-500/30 shadow-lg"
                  >
                    <motion.div
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Upload size={16} className="sm:w-5 sm:h-5" />
                    </motion.div>
                    {mode === 'encrypt' ? 'Upload Text File' : 'Upload Emoji File'}
                  </motion.label>
                </div>
              </div>
            </motion.div>

            {/* Right Section - Changes based on mode */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <div className="relative bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-cyan-500/20 shadow-2xl shadow-cyan-500/5 hover:shadow-cyan-500/10 transition-all duration-500">
                {/* Animated border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />
                
                <motion.h2 
                  className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: mode === 'encrypt' ? [0, 180, 360] : [0, -5, 5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {mode === 'encrypt' ? <Sparkles size={24} className="sm:w-7 sm:h-7" /> : <Unlock size={24} className="sm:w-7 sm:h-7" />}
                  </motion.div>
                  {mode === 'encrypt' ? 'Encrypted Emojis' : 'Decrypted Text'}
                </motion.h2>
                
                <div className="relative group/textarea">
                  <motion.textarea
                    value={mode === 'encrypt' ? result : inputText}
                    onChange={mode === 'decrypt' ? undefined : undefined}
                    placeholder={mode === 'encrypt' ? 'Encrypted emojis will appear here...' : 'Decrypted text will appear here...'}
                    className={`w-full h-40 sm:h-48 bg-slate-900/60 border-2 border-slate-600/50 rounded-2xl p-6 text-white placeholder-slate-400 resize-none focus:outline-none focus:border-cyan-500/60 focus:bg-slate-900/80 transition-all duration-300 leading-relaxed ${
                      mode === 'encrypt' ? 'text-2xl sm:text-3xl' : 'text-lg'
                    }`}
                    readOnly={true}
                    whileFocus={{ scale: 1.02 }}
                  />
                  <motion.div 
                    className="absolute bottom-3 right-3 px-3 py-1 bg-slate-700/60 rounded-lg text-xs text-slate-300"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {mode === 'encrypt' ? `${result.length} characters` : `${inputText.length} characters`}
                  </motion.div>
                  
                  {/* Animated border on focus */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-0 group-focus-within/textarea:opacity-20 transition-opacity duration-300 -z-10 blur-sm" />
                </div>

                {/* Download button for decrypted text in decrypt mode */}
                {mode === 'decrypt' && inputText && (
                  <div className="flex gap-3 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        downloadAsFile(inputText, 'decrypted-text.txt');
                        setSuccess('Decrypted text downloaded! 💾');
                      }}
                      className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500/90 hover:to-teal-500/90 rounded-xl transition-all duration-300 text-sm font-medium shadow-lg"
                    >
                      <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Download size={16} className="sm:w-5 sm:h-5" />
                      </motion.div>
                      Download Decrypted Text
                    </motion.button>
                  </div>
                )}

                {/* Emoji Stats - Only show in encrypt mode */}
                {emojiStats && mode === 'encrypt' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 sm:p-6 bg-gradient-to-r from-slate-900/60 to-slate-800/60 rounded-2xl border border-slate-600/30 backdrop-blur-sm"
                  >
                    <h4 className="font-bold mb-4 text-lg text-cyan-300 flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      >
                        📊
                      </motion.div>
                      Encryption Statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm sm:text-base">
                      <motion.div 
                        className="bg-slate-800/50 p-3 rounded-xl border border-slate-600/30"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-purple-300 font-medium">Total Emojis</div>
                        <div className="text-white text-lg font-bold">{emojiStats.totalEmojis}</div>
                      </motion.div>
                      <motion.div 
                        className="bg-slate-800/50 p-3 rounded-xl border border-slate-600/30"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-pink-300 font-medium">Unique Emojis</div>
                        <div className="text-white text-lg font-bold">{emojiStats.uniqueEmojis}</div>
                      </motion.div>
                      <motion.div 
                        className="bg-slate-800/50 p-3 rounded-xl border border-slate-600/30"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-cyan-300 font-medium">Data Size</div>
                        <div className="text-white text-lg font-bold">{emojiStats.estimatedBytes} bytes</div>
                      </motion.div>
                      <motion.div 
                        className="bg-slate-800/50 p-3 rounded-xl border border-slate-600/30"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-green-300 font-medium">Compression</div>
                        <div className="text-white text-lg font-bold">{(emojiStats.compressionRatio * 100).toFixed(1)}%</div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons - Only show for encrypted emojis in encrypt mode */}
                {result && mode === 'encrypt' && (
                  <div className="flex gap-3 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopy}
                      className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500/90 hover:to-teal-500/90 rounded-xl transition-all duration-300 text-sm font-medium shadow-lg"
                    >
                      <Copy size={16} className="sm:w-5 sm:h-5" />
                      Copy
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDownload}
                      className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-500/90 hover:to-purple-500/90 rounded-xl transition-all duration-300 text-sm font-medium shadow-lg"
                    >
                      <Download size={16} className="sm:w-5 sm:h-5" />
                      Download
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Centered Password Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="relative bg-gradient-to-br from-slate-800/50 via-purple-900/30 to-slate-800/50 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-purple-400/30 shadow-2xl shadow-purple-500/10">
              {/* Animated background glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 animate-pulse" />
              
              <motion.h3 
                className="text-2xl sm:text-3xl font-bold mb-6 text-center flex items-center justify-center gap-3 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Key size={28} className="sm:w-8 sm:h-8" />
                </motion.div>
                Security Password
              </motion.h3>
              
              <div className="space-y-6">
                <div className="relative group">
                  <motion.input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your encryption password..."
                    className="w-full bg-slate-900/60 border-2 border-slate-600/50 rounded-2xl p-5 pr-14 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/60 focus:bg-slate-900/80 transition-all duration-300 text-lg"
                    whileFocus={{ scale: 1.02 }}
                  />
                  <motion.button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-purple-400 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <motion.div
                      animate={{ rotate: showPassword ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                    </motion.div>
                  </motion.button>
                  
                  {/* Animated border on focus */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 opacity-0 group-focus-within:opacity-20 transition-opacity duration-300 -z-10 blur-sm" />
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
                disabled={isProcessing}
                className={`w-full py-5 mt-8 rounded-2xl font-bold text-lg sm:text-xl flex items-center justify-center gap-4 transition-all duration-500 shadow-2xl ${
                  mode === 'encrypt'
                    ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 shadow-cyan-500/30'
                    : 'bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 hover:from-purple-400 hover:via-pink-400 hover:to-cyan-400 shadow-purple-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed text-white`}
              >
                {isProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Shield size={24} className="sm:w-6 sm:h-6" />
                  </motion.div>
                ) : mode === 'encrypt' ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Lock size={24} className="sm:w-6 sm:h-6" />
                    </motion.div>
                    Encrypt to Emojis
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Unlock size={24} className="sm:w-6 sm:h-6" />
                    </motion.div>
                    Decrypt from Emojis
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-4 right-4 max-w-sm z-50"
            >
              <div
                className={`p-3 sm:p-4 rounded-xl shadow-2xl backdrop-blur-md border text-sm sm:text-base ${
                  error
                    ? 'bg-red-900/80 border-red-700/50 text-red-100'
                    : 'bg-green-900/80 border-green-700/50 text-green-100'
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
          className="mt-8 sm:mt-12 text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gray-800/40 backdrop-blur-md rounded-full border border-gray-700/50">
            <Shield size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm text-gray-400">
              Your data never leaves your browser • Client-side encryption only
            </span>
          </div>
          
          {/* Developer Credit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-center"
          >
            <p className="text-sm text-gray-500">
              Developed with ❤️ by{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">
                Satya
              </span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
