import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  plugins: [solid(), tailwindcss()],
  test: {
    environment: "jsdom",
  },
});
