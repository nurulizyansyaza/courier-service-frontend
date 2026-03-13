import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'

function readFrameworkConfig(): string {
  try {
    const raw = fs.readFileSync(path.resolve(__dirname, 'framework.config.json'), 'utf-8');
    return JSON.parse(raw).framework || 'react';
  } catch {
    return 'react';
  }
}

const framework = readFrameworkConfig();

const ENTRY_POINTS: Record<string, string> = {
  react: '/src/react/main.tsx',
  vue: '/src/vue/main.ts',
  svelte: '/src/svelte/main.ts',
};

async function loadFrameworkPlugin() {
  switch (framework) {
    case 'vue': {
      const vue = await import('@vitejs/plugin-vue');
      return vue.default();
    }
    case 'svelte': {
      const { svelte } = await import('@sveltejs/vite-plugin-svelte');
      return svelte();
    }
    default: {
      const react = await import('@vitejs/plugin-react');
      return react.default();
    }
  }
}

export default defineConfig(async () => {
  const frameworkPlugin = await loadFrameworkPlugin();

  return {
    plugins: [
      frameworkPlugin,
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
    define: {
      __FRAMEWORK__: JSON.stringify(framework),
      __ENTRY__: JSON.stringify(ENTRY_POINTS[framework]),
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
  };
});
