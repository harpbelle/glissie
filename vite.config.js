import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes the build work both at a domain root and in a
// GitHub Pages subfolder (e.g. harpbelle.github.io/glissie/).
export default defineConfig({
  plugins: [react()],
  base: "./",
});
