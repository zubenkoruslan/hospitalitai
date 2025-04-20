import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import postcssConfig from './postcss.config.js'; // No longer importing directly

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // css: { // <-- Remove explicit CSS config block
  //   postcss: './postcss.config.js'
  // },
  server: {
    proxy: {
      // Proxy /api requests to our backend server
      "/api": {
        target: "http://localhost:3000", // Your backend server address
        changeOrigin: true, // Recommended for virtual hosted sites
        // secure: false, // Uncomment if your backend uses HTTPS with a self-signed certificate
        // rewrite: (path) => path.replace(/^\/api/, ''), // Uncomment if you don't want /api prefix forwarded
      },
    },
  },
});
