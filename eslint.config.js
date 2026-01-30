import js from "@eslint/js"
import globals from "globals"
import pluginVue from "eslint-plugin-vue"
import { defineConfig } from "eslint/config"
import pluginSecurity from "eslint-plugin-security"

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,vue}"], plugins: { js }, extends: ["js/recommended", pluginSecurity.configs.recommended], languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginVue.configs["flat/essential"]
])
