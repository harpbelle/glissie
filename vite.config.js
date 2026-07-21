import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base is chosen by command so neither dev nor deploy needs manual editing:
//   build ("npm run deploy") -> "./"  relative paths that work in the GitHub
//                                     Pages subfolder (harpbelle.github.io/glissie/)
//   serve ("npm run dev")    -> "/"   plain root, so mobile testing over a
//                                     tunnel (allowedHosts + HMR on 443) works.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "./" : "/",
  server: {
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
  },
}));
