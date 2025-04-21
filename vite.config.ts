import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  base: '/SlotsGame/',
  server: {
    port: 8080,
    open: true,
  },
});
