import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
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

function frameworkSwitchPlugin(): Plugin {
  const ENTRIES: Record<string, string> = {
    react: '/src/react/main.tsx',
    vue: '/src/vue/main.ts',
    svelte: '/src/svelte/main.ts',
  };

  return {
    name: 'framework-switch',
    configureServer(server) {
      server.middlewares.use('/__api/switch-framework', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { framework: target } = JSON.parse(body);
            const valid = ['react', 'vue', 'svelte'];

            if (!target || !valid.includes(target)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, message: `Invalid framework. Use: ${valid.join(', ')}` }));
              return;
            }

            const current = readFrameworkConfig();
            if (current === target) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, message: `Already using ${target}` }));
              return;
            }

            const configPath = path.resolve(__dirname, 'framework.config.json');
            const indexPath = path.resolve(__dirname, 'index.html');
            const tsconfigPath = path.resolve(__dirname, 'tsconfig.json');

            // Unwatch files to prevent the old server from reacting to changes
            server.watcher.unwatch([configPath, indexPath, tsconfigPath]);

            // Update framework.config.json
            fs.writeFileSync(configPath, JSON.stringify({ framework: target }, null, 2) + '\n');

            // Update index.html entry point
            let html = fs.readFileSync(indexPath, 'utf-8');
            html = html.replace(
              /<script type="module" src="[^"]*"><\/script>/,
              `<script type="module" src="${ENTRIES[target]}"></script>`
            );
            fs.writeFileSync(indexPath, html);

            // Update tsconfig.json
            const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
            tsconfig.include = ['src/core', `src/${target}`, 'src/vite-env.d.ts'];
            tsconfig.compilerOptions = tsconfig.compilerOptions || {};
            if (target === 'svelte') {
              delete tsconfig.compilerOptions.jsx;
              delete tsconfig.compilerOptions.jsxImportSource;
            } else if (target === 'react') {
              tsconfig.compilerOptions.jsx = 'react-jsx';
            } else if (target === 'vue') {
              tsconfig.compilerOptions.jsx = 'preserve';
            }
            fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: `Switched to ${target}. Restarting server...` }));

            // Restart Vite server — re-reads vite.config.ts with correct plugin
            server.restart();
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: msg }));
          }
        });
      });
    },
  };
}

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
