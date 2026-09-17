import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // 相对路径，兼容 GitHub Pages 等任意子路径部署
  base: './',
  plugins: [react(), tailwindcss()],
})
