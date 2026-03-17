import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import {
  readFrameworkConfig,
  ENTRY_POINTS,
  frameworkSwitchPlugin,
  loadFrameworkPlugin,
} from './frameworkPlugin'

const framework = readFrameworkConfig();

export default defineConfig(async () => {
  const frameworkPlugin = await loadFrameworkPlugin(framework);

  return {
    plugins: [
      frameworkPlugin,
      frameworkSwitchPlugin(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        ...(framework === 'vue' ? { vue: 'vue/dist/vue.esm-bundler.js' } : {}),
      },
    },
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
      commonjsOptions: {
        include: [/courier-service-core/, /node_modules/],
      },
    },
    optimizeDeps: {
      include: ['@nurulizyansyaza/courier-service-core'],
    },
    define: {
      __FRAMEWORK__: JSON.stringify(framework),
      __ENTRY__: JSON.stringify(ENTRY_POINTS[framework]),
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      watch: {
        usePolling: true,
      },
      hmr: {
        // In Docker, the client connects from the host browser
        // so HMR WebSocket must use the host-mapped port
        clientPort: Number(process.env.VITE_HMR_PORT) || undefined,
      },
    },
  };
});
