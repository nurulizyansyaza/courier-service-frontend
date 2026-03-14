#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const configPath = resolve(root, 'framework.config.json');

const FRAMEWORKS = {
  react: {
    entry: '/src/react/main.tsx',
  },
  vue: {
    entry: '/src/vue/main.ts',
  },
  svelte: {
    entry: '/src/svelte/main.ts',
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

// Update index.html entry point
const nextConfig = FRAMEWORKS[target];
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
  tsconfig.include = ['src/core', `src/${target}`, 'src/vite-env.d.ts'];
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
  console.log(`Updated tsconfig.json include → ["src/core", "src/${target}", "src/vite-env.d.ts"]`);
}

console.log(`\n✓ Switched to ${target}`);
console.log(`  Entry: ${nextConfig.entry}\n`);
