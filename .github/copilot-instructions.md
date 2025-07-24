# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a secure text-to-emoji encryption web application built with Next.js and TypeScript. The project focuses on:

## Security Features
- Use AES-256-GCM encryption (strongest available symmetric encryption)
- Implement PBKDF2 for password-based key derivation
- Use cryptographically secure random number generation
- Implement proper salt generation and storage
- Use constant-time comparison for authentication tags
- Clear sensitive data from memory after use

## UI/UX Guidelines
- Use Framer Motion for smooth animations
- Implement modern, clean design with Tailwind CSS
- Focus on accessibility and user experience
- Use emoji encoding for visual appeal
- Implement responsive design patterns

## Code Quality
- Use TypeScript for type safety
- Implement proper error handling
- Follow React best practices
- Use proper separation of concerns
- Implement proper validation for all inputs

## Emoji Encoding System
- Create a secure mapping system for binary data to emojis
- Ensure the emoji encoding doesn't leak any information about the underlying data
- Use a diverse set of emojis to maintain visual appeal
