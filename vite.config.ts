/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/copper-co/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
