#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const configPath = resolve(root, 'framework.config.json');

const FRAMEWORKS = {
  react: {
    entry: '/src/react/main.tsx',
    deps: ['react@18.3.1', 'react-dom@18.3.1', 'lucide-react@0.487.0'],
    devDeps: ['@vitejs/plugin-react@4.7.0', '@types/react@latest', '@types/react-dom@latest'],
  },
  vue: {
    entry: '/src/vue/main.ts',
    deps: ['vue@3.5.17', 'lucide-vue-next@0.487.0'],
    devDeps: ['@vitejs/plugin-vue@5.2.4'],
  },
  svelte: {
    entry: '/src/svelte/main.ts',
    deps: ['lucide-svelte@0.487.0'],
    devDeps: ['@sveltejs/vite-plugin-svelte@5.0.3', 'svelte@5.34.6'],
  },
};

const target = process.argv[2];

if (!target || !FRAMEWORKS[target]) {
  console.error(`Usage: node scripts/switch-framework.js <react|vue|svelte>`);
  process.exit(1);
}

// Read current config
let current = 'react';
if (existsSync(configPath)) {
  try {
    current = JSON.parse(readFileSync(configPath, 'utf-8')).framework;
  } catch {
    // ignore parse errors
  }
}

if (current === target) {
  console.log(`Already using ${target}. Nothing to do.`);
  process.exit(0);
}

console.log(`\nSwitching framework: ${current} → ${target}\n`);

// Update config
writeFileSync(configPath, JSON.stringify({ framework: target }, null, 2) + '\n');

// Remove previous framework-specific deps
const prevConfig = FRAMEWORKS[current];
if (prevConfig) {
  const stripVersion = (d) => d.replace(/@[^@/]*$/, '');
  const prevPkgs = [
    ...prevConfig.deps.map(stripVersion),
    ...prevConfig.devDeps.map(stripVersion),
  ];
  if (prevPkgs.length > 0) {
    console.log(`Removing ${current} dependencies...`);
    try {
      execSync(`npm remove ${prevPkgs.join(' ')}`, { cwd: root, stdio: 'inherit' });
    } catch {
      // Some packages may not have been installed yet — that's fine
    }
  }
}

// Install new framework deps
const nextConfig = FRAMEWORKS[target];
console.log(`\nInstalling ${target} dependencies...`);
execSync(`npm install ${nextConfig.deps.join(' ')}`, { cwd: root, stdio: 'inherit' });
execSync(`npm install -D ${nextConfig.devDeps.join(' ')}`, { cwd: root, stdio: 'inherit' });

// Update index.html entry point
const indexPath = resolve(root, 'index.html');
let html = readFileSync(indexPath, 'utf-8');
html = html.replace(
  /<script type="module" src="[^"]*"><\/script>/,
  `<script type="module" src="${nextConfig.entry}"></script>`
);
writeFileSync(indexPath, html);
console.log(`Updated index.html entry → ${nextConfig.entry}`);

// Update tsconfig.json include paths
const tsconfigPath = resolve(root, 'tsconfig.json');
if (existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
  tsconfig.include = ['src/core', `src/${target}`];
  if (target === 'svelte') {
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    delete tsconfig.compilerOptions.jsx;
    delete tsconfig.compilerOptions.jsxImportSource;
  } else if (target === 'react') {
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.jsx = 'react-jsx';
  } else if (target === 'vue') {
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.jsx = 'preserve';
  }
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  console.log(`Updated tsconfig.json include → ["src/core", "src/${target}"]`);
}

console.log(`\n✓ Switched to ${target}`);
console.log(`  Entry: ${nextConfig.entry}`);
console.log(`  Run "npm run dev" to start the dev server.\n`);
