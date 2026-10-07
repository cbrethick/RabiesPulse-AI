import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the same build works on Vercel and inside the Android (Capacitor) app
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});
