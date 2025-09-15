import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/my-vue-app/' // <-- REPLACE with your repo name (trailing slash!)
})
