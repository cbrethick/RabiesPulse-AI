import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Two apps from one codebase:
//   npm run build          -> dist/          citizen app, packaged into the Android APK
//   npm run build:officer  -> dist-officer/  officer dashboard, the only thing deployed to Vercel
// base './' so the citizen build also works inside the Android (Capacitor) WebView.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  build: mode === 'officer' ? { outDir: 'dist-officer', rollupOptions: { input: { officer: 'officer.html' } } } : {},
  test: { environment: 'node' },
}));
