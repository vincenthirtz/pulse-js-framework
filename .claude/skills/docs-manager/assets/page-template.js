/**
 * Documentation Page Template
 * Use this template when creating new documentation pages
 */

import { el } from '/runtime/index.js';
import { t } from '../i18n/index.js';
import { highlightCode } from '../highlighter.js';

/**
 * Example Page Component
 * Replace 'Example' with the actual page name (e.g., HttpPage, FormPage)
 */
export function ExamplePage() {
  return el('article.docs-page', [
    // Page Title
    el('h1', () => t('pages.example.title')),

    // Introduction Section
    el('section.intro', [
      el('p', () => t('pages.example.intro')),
      el('p', 'Add your introduction text here.')
    ]),

    // Quick Start Section
    el('section.quick-start', [
      el('h2', 'Quick Start'),
      el('pre', el('code.language-javascript',
        highlightCode(`
import { example } from 'pulse-js-framework/runtime';

const instance = example({ option: 'value' });
instance.doSomething();
        `.trim(), 'javascript')
      ))
    ]),

    // API Reference Section
    el('section.api', [
      el('h2', 'API Reference'),

      // API Function
      el('h3', () => el('code', 'functionName(param)')),
      el('p', 'Description of what this function does.'),

      // Parameters
      el('h4', 'Parameters'),
      el('ul', [
        el('li', [
          el('code', 'param'),
          ' (Type) - Description of parameter'
        ])
      ]),

      // Returns
      el('h4', 'Returns'),
      el('p', () => el('code', 'ReturnType'), ' - Description of return value')
    ]),

    // Examples Section
    el('section.examples', [
      el('h2', 'Examples'),

      el('h3', 'Basic Example'),
      el('pre', el('code.language-javascript',
        highlightCode(`
// Example code here
const result = functionName('value');
        `.trim(), 'javascript')
      )),

      el('h3', 'Advanced Example'),
      el('pre', el('code.language-javascript',
        highlightCode(`
// More complex example
const advanced = functionName({
  option1: 'value',
  option2: true
});
        `.trim(), 'javascript')
      ))
    ]),

    // Use Cases Section
    el('section.use-cases', [
      el('h2', 'Common Use Cases'),
      el('ul', [
        el('li', 'Use case 1 description'),
        el('li', 'Use case 2 description'),
        el('li', 'Use case 3 description')
      ])
    ]),

    // Best Practices Section
    el('section.best-practices', [
      el('h2', 'Best Practices'),
      el('ul', [
        el('li', 'Best practice 1'),
        el('li', 'Best practice 2')
      ])
    ]),

    // Related Pages Section
    el('section.related', [
      el('h2', 'See Also'),
      el('ul', [
        el('li', el('a[href=/docs/related-page]', 'Related Page'))
      ])
    ])
  ]);
}
