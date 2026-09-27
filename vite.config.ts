import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

/** Unique per build. Baked into the app and written to /version.json, so an open app can tell it's out of date. */
const BUILD_ID = new Date().toISOString()

/** Emits dist/version.json ({ "build": BUILD_ID }) next to index.html. */
function versionFile(): Plugin {
  return {
    name: 'eulevo-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
    },
  }
}

export default defineConfig({
  plugins: [vue(), versionFile()],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
