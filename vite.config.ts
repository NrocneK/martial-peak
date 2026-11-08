import { defineConfig } from 'vite';

// Cấu hình Vite. Tách Phaser ra một file riêng (chunk) để trình duyệt cache tốt hơn
// và tránh cảnh báo "chunk quá lớn" (Phaser nặng khoảng 1MB).
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
