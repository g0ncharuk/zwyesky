import { defineConfig } from "vite";
import javascriptObfuscator from "rollup-plugin-javascript-obfuscator";

export default defineConfig({
  plugins: [
    {
      ...javascriptObfuscator({}),
      enforce: "post",
    },
  ],
});
