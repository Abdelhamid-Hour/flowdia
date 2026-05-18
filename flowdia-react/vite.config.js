/**
 * @file vite.config.js
 * @description Vite build configuration for the Flowdia SPA.
 * Configures the React plugin for JSX transformation and the Tailwind CSS v4
 * Vite plugin for atomic CSS compilation. Also sets up the `@` path alias
 * to mirror the import convention used in the original Next.js codebase.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Mirrors the Next.js `@/` path alias so all existing import paths work unchanged.
      '@': path.resolve(__dirname, './src'),
    },
  },
})
