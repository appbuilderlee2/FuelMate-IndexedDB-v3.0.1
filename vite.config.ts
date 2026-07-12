import path from 'path';
import { defineConfig } from 'vite';


export default defineConfig(() => {
    return {
      base: '/FuelMate-IndexedDB-v3.0.1/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
