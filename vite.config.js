import { defineConfig } from "vite";
import javascriptObfuscator from "rollup-plugin-javascript-obfuscator";

export default defineConfig({
  base: "/zwyesky/",
  plugins: [
    {
      ...javascriptObfuscator({}),
      enforce: "post",
    },
  ],
});
