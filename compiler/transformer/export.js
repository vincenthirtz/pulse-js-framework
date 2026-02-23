/**
 * Transformer Export Module
 * Handles component export generation
 * @module pulse-js-framework/compiler/transformer/export
 */

/**
 * Generate component export
 * @param {Object} transformer - Transformer instance
 * @returns {string} JavaScript code
 */
export function generateExport(transformer) {
  const pageName = transformer.ast.page?.name || 'Component';
  const routePath = transformer.ast.route?.path || null;
  const hasInit = transformer.actionNames.has('init');
  const directive = transformer.directive;

  const lines = ['// Export'];
  lines.push(`export const ${pageName} = {`);
  lines.push('  render,');

  if (routePath) {
    lines.push(`  route: ${JSON.stringify(routePath)},`);
  }

  // Add Server Component directive metadata
  if (directive) {
    lines.push(`  __directive: ${JSON.stringify(directive)},  // 'use client' or 'use server'`);
    lines.push(`  __componentId: ${JSON.stringify(pageName)},`);
  }

  // Mount with reactive re-rendering (preserves focus)
  lines.push('  mount: (target) => {');
  lines.push('    const container = typeof target === "string" ? document.querySelector(target) : target;');
  lines.push('    let currentEl = null;');
  lines.push('    effect(() => {');
  lines.push('      // Save focus state before re-render');
  lines.push('      const activeEl = document.activeElement;');
  lines.push('      const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");');
  lines.push('      const focusInfo = isInput ? {');
  lines.push('        tag: activeEl.tagName.toLowerCase(),');
  lines.push('        type: activeEl.type || "",');
  lines.push('        placeholder: activeEl.placeholder || "",');
  lines.push('        ariaLabel: activeEl.getAttribute("aria-label") || "",');
  lines.push('        start: activeEl.selectionStart,');
  lines.push('        end: activeEl.selectionEnd');
  lines.push('      } : null;');
  lines.push('      const newEl = render();');
  lines.push('      if (currentEl) {');
  lines.push('        container.replaceChild(newEl, currentEl);');
  lines.push('      } else {');
  lines.push('        container.appendChild(newEl);');
  lines.push('      }');
  lines.push('      currentEl = newEl;');
  lines.push('      // Restore focus after re-render');
  lines.push('      if (focusInfo) {');
  lines.push('        let selector = focusInfo.tag;');
  lines.push('        if (focusInfo.ariaLabel) selector += `[aria-label="${focusInfo.ariaLabel}"]`;');
  lines.push('        else if (focusInfo.placeholder) selector += `[placeholder="${focusInfo.placeholder}"]`;');
  lines.push('        const newActive = newEl.querySelector(selector);');
  lines.push('        if (newActive) {');
  lines.push('          newActive.focus();');
  lines.push('          if (typeof focusInfo.start === "number") {');
  lines.push('            try { newActive.setSelectionRange(focusInfo.start, focusInfo.end); } catch(e) {}');
  lines.push('          }');
  lines.push('        }');
  lines.push('      }');
  lines.push('    });');
  if (hasInit) {
    lines.push('    init();');
  }
  lines.push('    return { unmount: () => currentEl?.remove() };');
  lines.push('  }');
  lines.push('};');
  lines.push('');
  lines.push(`export default ${pageName};`);

  return lines.join('\n');
}
