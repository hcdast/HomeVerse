import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000, // 前端端口 3000（确保使用此端口）
    strictPort: true, // 强制使用 3000，如果被占用则报错
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // 后端端口 3001
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // 支持文件上传
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        },
      },
    },
  },
});

