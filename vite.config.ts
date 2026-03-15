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
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
