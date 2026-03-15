import type { Framework } from '../types';

export interface Token {
  text: string;
  className: string;
}

export function tokenize(line: string, framework: Framework): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  const jsKeywords = /^(import|export|from|const|let|var|function|return|if|else|for|of|in|new|interface|type|class|extends|implements|async|await|default|void)\b/;
  const jsFlowKeywords = /^(map|filter|reduce|forEach|push|splice|find|findIndex|some|every)\b/;
  const reactKeywords = /^(useState|useMemo|useEffect|useCallback|useRef)\b/;
  const vueKeywords = /^(ref|computed|watch|watchEffect|onMounted|defineProps|defineEmits)\b/;
  const svelteKeywords = /^(\$:)/;
  const typeKeywords = /^(string|number|boolean|Record|Array|Promise|any)\b/;
  const controlKeywords = /^(script|template|style|div|span|h2|h3|p)\b/;
  const jsLiterals = /^(true|false|null|undefined|Math)\b/;

  while (remaining.length > 0) {
    const wsMatch = remaining.match(/^(\s+)/);
    if (wsMatch) {
      tokens.push({ text: wsMatch[1], className: '' });
      remaining = remaining.slice(wsMatch[1].length);
      continue;
    }

    if (remaining.startsWith('//')) {
      tokens.push({ text: remaining, className: 'text-zinc-600' });
      break;
    }

    if (remaining.startsWith('<!--') || remaining.startsWith('{#') || remaining.startsWith('{/') || remaining.startsWith('{:')) {
      tokens.push({ text: remaining, className: 'text-zinc-600' });
      break;
    }

    const svelteMatch = remaining.match(svelteKeywords);
    if (svelteMatch) {
      tokens.push({ text: svelteMatch[0], className: 'text-purple-400' });
      remaining = remaining.slice(svelteMatch[0].length);
      continue;
    }

    if (remaining.startsWith('<') && (framework === 'vue' || framework === 'svelte')) {
      const tagMatch = remaining.match(/^(<\/?[\w-]+)/);
      if (tagMatch) {
        tokens.push({ text: tagMatch[0], className: 'text-pink-400' });
        remaining = remaining.slice(tagMatch[0].length);
        continue;
      }
    }

    if (remaining.startsWith('>') || remaining.startsWith('/>')) {
      const close = remaining.startsWith('/>') ? '/>' : '>';
      tokens.push({ text: close, className: 'text-pink-400' });
      remaining = remaining.slice(close.length);
      continue;
    }

    const strMatch = remaining.match(/^('[^']*'|"[^"]*"|`[^`]*`)/);
    if (strMatch) {
      tokens.push({ text: strMatch[0], className: 'text-emerald-400' });
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    const numMatch = remaining.match(/^(\d+\.?\d*)/);
    if (numMatch) {
      tokens.push({ text: numMatch[0], className: 'text-amber-400' });
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    const reactMatch = remaining.match(reactKeywords);
    if (reactMatch) {
      tokens.push({ text: reactMatch[0], className: 'text-purple-400' });
      remaining = remaining.slice(reactMatch[0].length);
      continue;
    }

    const vueMatch = remaining.match(vueKeywords);
    if (vueMatch) {
      tokens.push({ text: vueMatch[0], className: 'text-purple-400' });
      remaining = remaining.slice(vueMatch[0].length);
      continue;
    }

    const typeMatch = remaining.match(typeKeywords);
    if (typeMatch) {
      tokens.push({ text: typeMatch[0], className: 'text-cyan-400' });
      remaining = remaining.slice(typeMatch[0].length);
      continue;
    }

    const kwMatch = remaining.match(jsKeywords);
    if (kwMatch) {
      tokens.push({ text: kwMatch[0], className: 'text-pink-400' });
      remaining = remaining.slice(kwMatch[0].length);
      continue;
    }

    const litMatch = remaining.match(jsLiterals);
    if (litMatch) {
      tokens.push({ text: litMatch[0], className: 'text-amber-400' });
      remaining = remaining.slice(litMatch[0].length);
      continue;
    }

    const methodMatch = remaining.match(jsFlowKeywords);
    if (methodMatch) {
      tokens.push({ text: methodMatch[0], className: 'text-violet-400' });
      remaining = remaining.slice(methodMatch[0].length);
      continue;
    }

    const ctrlMatch = remaining.match(controlKeywords);
    if (ctrlMatch && (framework === 'vue' || framework === 'svelte')) {
      tokens.push({ text: ctrlMatch[0], className: 'text-pink-400' });
      remaining = remaining.slice(ctrlMatch[0].length);
      continue;
    }

    if (remaining.match(/^[\w-]+(?=\s*:)/) && (framework === 'vue' || framework === 'svelte')) {
      const cssMatch = remaining.match(/^[\w-]+/);
      if (cssMatch) {
        tokens.push({ text: cssMatch[0], className: 'text-cyan-300' });
        remaining = remaining.slice(cssMatch[0].length);
        continue;
      }
    }

    const opMatch = remaining.match(/^(=>|===|!==|&&|\|\||[=+\-*/<>!?:;,.|&{}()\[\]])/);
    if (opMatch) {
      tokens.push({ text: opMatch[0], className: 'text-zinc-500' });
      remaining = remaining.slice(opMatch[0].length);
      continue;
    }

    const idMatch = remaining.match(/^[\w$]+/);
    if (idMatch) {
      tokens.push({ text: idMatch[0], className: 'text-zinc-300' });
      remaining = remaining.slice(idMatch[0].length);
      continue;
    }

    tokens.push({ text: remaining[0], className: 'text-zinc-300' });
    remaining = remaining.slice(1);
  }

  return tokens;
}
