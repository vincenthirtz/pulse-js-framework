# Markdown to Component Conversion Guide

This guide shows how to convert markdown content to Pulse documentation page components.

## Basic Conversions

### Headings

```markdown
# Main Title
## Section Heading
### Subsection
```

```javascript
el('h1', 'Main Title'),
el('h2', 'Section Heading'),
el('h3', 'Subsection')
```

### Paragraphs

```markdown
This is a paragraph with some text.

Another paragraph here.
```

```javascript
el('p', 'This is a paragraph with some text.'),
el('p', 'Another paragraph here.')
```

### Code Blocks

````markdown
```javascript
const count = pulse(0);
count.set(5);
```
````

```javascript
import { highlightCode } from '../highlighter.js';

el('pre', el('code.language-javascript',
  highlightCode(`
const count = pulse(0);
count.set(5);
  `.trim(), 'javascript')
))
```

### Inline Code

```markdown
Use the `pulse()` function to create reactive values.
```

```javascript
el('p', [
  'Use the ',
  el('code', 'pulse()'),
  ' function to create reactive values.'
])
```

### Lists

```markdown
- Item 1
- Item 2
- Item 3
```

```javascript
el('ul', [
  el('li', 'Item 1'),
  el('li', 'Item 2'),
  el('li', 'Item 3')
])
```

### Numbered Lists

```markdown
1. First step
2. Second step
3. Third step
```

```javascript
el('ol', [
  el('li', 'First step'),
  el('li', 'Second step'),
  el('li', 'Third step')
])
```

### Links

```markdown
See the [API Reference](/docs/api) for more details.
```

```javascript
el('p', [
  'See the ',
  el('a[href=/docs/api]', 'API Reference'),
  ' for more details.'
])
```

### Tables

```markdown
| Method | Description |
|--------|-------------|
| get()  | Read value  |
| set()  | Write value |
```

```javascript
el('table', [
  el('thead', el('tr', [
    el('th', 'Method'),
    el('th', 'Description')
  ])),
  el('tbody', [
    el('tr', [
      el('td', el('code', 'get()')),
      el('td', 'Read value')
    ]),
    el('tr', [
      el('td', el('code', 'set()')),
      el('td', 'Write value')
    ])
  ])
])
```

## Advanced Conversions

### Blockquotes / Notes

```markdown
> **Note**: This is important information.
```

```javascript
el('.note', [
  el('strong', 'Note:'),
  ' This is important information.'
])
```

### Warnings

```markdown
> **Warning**: This can cause issues.
```

```javascript
el('.warning', [
  el('strong', 'Warning:'),
  ' This can cause issues.'
])
```

### Code with Highlighting

````markdown
```javascript
// Create a signal
const count = pulse(0); // Initial value

// Read the value
console.log(count.get()); // 0

// Update the value
count.set(5);
```
````

```javascript
el('section.examples', [
  el('h3', 'Creating Signals'),
  el('pre', el('code.language-javascript',
    highlightCode(`
// Create a signal
const count = pulse(0); // Initial value

// Read the value
console.log(count.get()); // 0

// Update the value
count.set(5);
    `.trim(), 'javascript')
  ))
])
```

### Multiple Code Examples

````markdown
### Basic Usage

```javascript
const user = pulse({ name: 'John' });
```

### Advanced Usage

```javascript
const user = pulse({ name: 'John' }, {
  equals: (a, b) => a.id === b.id
});
```
````

```javascript
el('section.examples', [
  el('h2', 'Examples'),

  el('h3', 'Basic Usage'),
  el('pre', el('code.language-javascript',
    highlightCode(`
const user = pulse({ name: 'John' });
    `.trim(), 'javascript')
  )),

  el('h3', 'Advanced Usage'),
  el('pre', el('code.language-javascript',
    highlightCode(`
const user = pulse({ name: 'John' }, {
  equals: (a, b) => a.id === b.id
});
    `.trim(), 'javascript')
  ))
])
```

## API Reference Conversions

### Function Signature

```markdown
## createRouter(options)

Creates a new router instance.

**Parameters:**
- `options` (Object) - Router configuration
  - `routes` (Object) - Route definitions
  - `mode` (String) - 'history' or 'hash'

**Returns:** Router instance
```

```javascript
el('section.api', [
  el('h2', 'API Reference'),

  // Function signature
  el('h3', () => el('code', 'createRouter(options)')),
  el('p', 'Creates a new router instance.'),

  // Parameters
  el('h4', 'Parameters'),
  el('ul', [
    el('li', [
      el('code', 'options'),
      ' (Object) - Router configuration',
      el('ul', [
        el('li', [
          el('code', 'routes'),
          ' (Object) - Route definitions'
        ]),
        el('li', [
          el('code', 'mode'),
          ' (String) - ',
          el('code', "'history'"),
          ' or ',
          el('code', "'hash'")
        ])
      ])
    ])
  ]),

  // Returns
  el('h4', 'Returns'),
  el('p', 'Router instance')
])
```

## Special Elements

### Info Boxes

```markdown
ℹ️ **Tip**: You can use keyboard shortcuts.
```

```javascript
el('.info-box', [
  el('.icon', 'ℹ️'),
  el('div', [
    el('strong', 'Tip:'),
    ' You can use keyboard shortcuts.'
  ])
])
```

### Call-out Boxes

```markdown
💡 **Best Practice**: Always provide a key function for lists.
```

```javascript
el('.callout', [
  el('.icon', '💡'),
  el('div', [
    el('strong', 'Best Practice:'),
    ' Always provide a key function for lists.'
  ])
])
```

## Internationalization

When adding translatable content, use the `t()` function:

```javascript
// Instead of:
el('h1', 'HTTP Client')

// Use:
el('h1', () => t('pages.http.title'))

// Then add to docs/src/i18n/en.js:
pages: {
  http: {
    title: 'HTTP Client'
  }
}
```

## Syntax Highlighting

The `highlightCode()` function supports these languages:

- `'javascript'` or `'js'`
- `'typescript'` or `'ts'`
- `'html'`
- `'css'`
- `'json'`
- `'bash'` or `'shell'`

Example:
```javascript
import { highlightCode } from '../highlighter.js';

el('pre', el('code.language-bash',
  highlightCode('npm install pulse-js-framework', 'bash')
))
```

## Responsive Images

```markdown
![Architecture Diagram](./assets/architecture.png)
```

```javascript
el('img.responsive', {
  src: '/docs/assets/architecture.png',
  alt: 'Architecture Diagram',
  loading: 'lazy'
})
```

## Navigation Sections

### Table of Contents

When adding a new major section, it should appear in the page's TOC:

```javascript
// Major sections automatically appear in TOC if they have an id
el('section#installation', [
  el('h2', 'Installation'),
  // ... content
])
```

### Related Links

```markdown
## See Also

- [Router Documentation](/docs/router)
- [Store Documentation](/docs/store)
```

```javascript
el('section.related', [
  el('h2', 'See Also'),
  el('ul', [
    el('li', el('a[href=/docs/router]', 'Router Documentation')),
    el('li', el('a[href=/docs/store]', 'Store Documentation'))
  ])
])
```
