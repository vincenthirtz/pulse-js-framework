/**
 * Pulse Documentation - Syntax Highlighter (no dependencies)
 */

import { t } from './state.js';

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

/**
 * Create a copy button element
 */
function createCopyButton(code) {
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.type = 'button';
  copyBtn.setAttribute('aria-label', t('actions.copy'));
  copyBtn.innerHTML = `
    <span class="copy-icon">📋</span>
    <span class="copy-text">${t('actions.copy')}</span>
  `;

  // Handle click
  copyBtn.addEventListener('click', async () => {
    const textToCopy = code.textContent;
    try {
      await navigator.clipboard.writeText(textToCopy);
      const copyText = copyBtn.querySelector('.copy-text');
      const originalText = copyText.textContent;
      copyText.textContent = t('actions.copied');
      copyBtn.classList.add('copied');

      setTimeout(() => {
        copyText.textContent = originalText;
        copyBtn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  });

  return copyBtn;
}

/**
 * Add copy button to a code block
 */
function addCopyButton(codeBlock) {
  // Skip if already has a copy button
  if (codeBlock.querySelector('.copy-btn')) return;

  const pre = codeBlock.querySelector('pre');
  const code = codeBlock.querySelector('code');
  if (!pre || !code) return;

  // Get or create header
  let header = codeBlock.querySelector('.code-header');
  const headerText = header?.textContent?.trim() || '';

  if (!header) {
    header = document.createElement('div');
    header.className = 'code-header code-header-minimal';
    codeBlock.insertBefore(header, pre);
  }

  // Create copy button
  const copyBtn = createCopyButton(code);

  // Set up header layout
  header.style.display = 'flex';
  header.style.alignItems = 'center';

  if (headerText) {
    // Header has text content
    header.style.justifyContent = 'space-between';

    // If header only has text nodes, wrap them in a span
    if (!header.querySelector('span')) {
      const text = header.textContent;
      header.textContent = '';
      const span = document.createElement('span');
      span.textContent = text;
      header.appendChild(span);
    }

    header.appendChild(copyBtn);
  } else {
    // Empty or new header - minimal style with button on right
    header.style.justifyContent = 'flex-end';
    header.classList.add('code-header-minimal');
    header.appendChild(copyBtn);
  }
}

/**
 * Add copy buttons to all code blocks on the page
 */
function addCopyButtonsToAllCodeBlocks() {
  document.querySelectorAll('.code-block').forEach(addCopyButton);
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

  // Add copy buttons to all code blocks
  addCopyButtonsToAllCodeBlocks();
}
