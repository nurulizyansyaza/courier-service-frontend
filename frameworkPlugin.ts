import type { Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

const ROOT_DIR = path.resolve(__dirname);

export function readFrameworkConfig(): string {
  try {
    const raw = fs.readFileSync(path.resolve(ROOT_DIR, 'framework.config.json'), 'utf-8');
    return JSON.parse(raw).framework || 'react';
  } catch {
    return 'react';
  }
}

export const ENTRY_POINTS: Record<string, string> = {
  react: '/src/react/main.tsx',
  vue: '/src/vue/main.ts',
  svelte: '/src/svelte/main.ts',
};

export function frameworkSwitchPlugin(): Plugin {
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

            const configPath = path.resolve(ROOT_DIR, 'framework.config.json');
            const indexPath = path.resolve(ROOT_DIR, 'index.html');
            const tsconfigPath = path.resolve(ROOT_DIR, 'tsconfig.json');

            server.watcher.unwatch([configPath, indexPath, tsconfigPath]);

            fs.writeFileSync(configPath, JSON.stringify({ framework: target }, null, 2) + '\n');

            let html = fs.readFileSync(indexPath, 'utf-8');
            html = html.replace(
              /<script type="module" src="[^"]*"><\/script>/,
              `<script type="module" src="${ENTRY_POINTS[target]}"></script>`
            );
            fs.writeFileSync(indexPath, html);

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

export async function loadFrameworkPlugin(framework: string) {
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
