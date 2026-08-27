import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // `/_vercel/image` chỉ tồn tại trên bản triển khai Vercel. Khi chạy máy cá
  // nhân, cờ này tắt để src/img.js trả ảnh gốc thay vì URL 404. Vercel đặt
  // VERCEL=1 trong môi trường build.
  define: {
    __IMG_OPT__: JSON.stringify(Boolean(process.env.VERCEL))
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000'
    }
  }
});
