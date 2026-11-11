import { defineConfig } from 'vite';

// Cấu hình Vite. Tách Phaser ra một file riêng (chunk) để trình duyệt cache tốt hơn
// và tránh cảnh báo "chunk quá lớn" (Phaser nặng khoảng 1MB).
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      // 2 trang: game (index.html) + trang xem thử VFX kỹ năng (vfx-lab.html, tách khỏi game)
      input: { main: 'index.html', lab: 'vfx-lab.html' },
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
