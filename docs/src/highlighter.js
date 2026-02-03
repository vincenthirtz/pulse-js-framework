/**
 * Pulse Documentation - Syntax Highlighter (no dependencies)
 */

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightCode(code, lang = 'js') {
  const tokens = [];
  let tokenId = 0;

  // Helper to replace with token placeholder (using unique markers that won't be stripped)
  function tokenize(match, className) {
    const id = `\u2060TK${tokenId++}\u2060`;
    tokens.push({ id, html: `<span class="${className}">${escapeHtml(match)}</span>` });
    return id;
  }

  let result = code;

  if (lang === 'pulse' || lang === 'js' || lang === 'javascript') {
    // 1. Strings first (to protect their content)
    result = result.replace(/(['"`])(?:(?!\1)[^\\]|\\.)*?\1/g, m => tokenize(m, 'hljs-string'));

    // 2. Comments
    result = result.replace(/\/\/.*$/gm, m => tokenize(m, 'hljs-comment'));
    result = result.replace(/\/\*[\s\S]*?\*\//g, m => tokenize(m, 'hljs-comment'));

    // 3. Pulse directives (@page, @click, etc) - but not @media
    result = result.replace(/@(page|click|submit|change|input|focus|blur|keydown|keyup|route)\b/g, m => tokenize(m, 'hljs-directive'));

    // 4. Pulse blocks
    result = result.replace(/\b(state|view|style|actions)\s*\{/g, (m, kw) => tokenize(kw, 'hljs-keyword') + ' {');

    // 5. Keywords
    const keywords = 'const|let|var|function|return|if|else|for|while|import|export|from|class|extends|new|this|async|await|try|catch|throw|default|switch|case|break|continue|typeof|instanceof';
    result = result.replace(new RegExp(`\\b(${keywords})\\b`, 'g'), m => tokenize(m, 'hljs-keyword'));

    // 6. Numbers (but not inside token placeholders)
    result = result.replace(/(?<!\u2060TK)\b(\d+\.?\d*)\b/g, m => tokenize(m, 'hljs-number'));

    // 7. Function calls
    result = result.replace(/\b([a-zA-Z_]\w*)\s*\(/g, (m, fn) => tokenize(fn, 'hljs-function') + '(');

    // Escape remaining HTML (but not our token markers)
    result = result.replace(/[<>&]/g, m => {
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      if (m === '&') return '&amp;';
      return m;
    });

  } else if (lang === 'bash' || lang === 'shell') {
    // Comments first
    result = result.replace(/#.*$/gm, m => tokenize(m, 'hljs-comment'));

    // Commands at start of line
    result = result.replace(/^(\w+)/gm, m => tokenize(m, 'hljs-function'));

    // Flags
    result = result.replace(/\s(--?\w+)/g, (m, flag) => ' ' + tokenize(flag, 'hljs-keyword'));

    // Escape remaining
    result = escapeHtml(result);

  } else {
    result = escapeHtml(result);
  }

  // Restore tokens
  for (const { id, html } of tokens) {
    result = result.replace(id, html);
  }

  return result;
}

export function highlightAllCode() {
  document.querySelectorAll('pre code').forEach(block => {
    const parent = block.closest('.code-block');
    const header = parent?.querySelector('.code-header');
    let lang = 'js';

    // Detect language from header or content
    if (header) {
      const headerText = header.textContent.toLowerCase();
      if (headerText.includes('pulse') || headerText.includes('.pulse')) lang = 'pulse';
      else if (headerText.includes('css')) lang = 'css';
      else if (headerText.includes('bash') || headerText.includes('terminal')) lang = 'bash';
      else if (headerText.includes('vite')) lang = 'js';
    }

    // Also detect from content
    const content = block.textContent;
    if (content.includes('@page') || content.includes('state {') || content.includes('view {')) {
      lang = 'pulse';
    } else if (content.startsWith('npm ') || content.startsWith('cd ') || content.startsWith('npx ')) {
      lang = 'bash';
    }

    block.innerHTML = highlightCode(block.textContent, lang);
  });
}
