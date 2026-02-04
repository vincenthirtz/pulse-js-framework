/**
 * Pulse Documentation - Security Guide
 */

import { el } from '/runtime/index.js';
import { t, navigateLocale } from '../state.js';

export function SecurityPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>${t('security.title')}</h1>
    <p class="intro">${t('security.intro')}</p>

    <section class="doc-section">
      <h2>${t('security.xssPrevention')}</h2>
      <p>Cross-Site Scripting (XSS) is one of the most common web vulnerabilities. Pulse provides built-in protections, but you must use the APIs correctly.</p>

      <h3>Safe by Default: Text Content</h3>
      <p>The <code>el()</code> function with string children automatically escapes HTML:</p>
      <div class="code-block">
        <pre><code>// SAFE: Content is automatically escaped
const userInput = '&lt;script&gt;alert("XSS")&lt;/script&gt;';
el('div', userInput);
// Renders as text: &lt;script&gt;alert("XSS")&lt;/script&gt;

// SAFE: Reactive text is also escaped
const message = pulse(userInput);
el('div', text(() => message.get()));</code></pre>
      </div>

      <h3>Dangerous: innerHTML</h3>
      <p>Never use <code>innerHTML</code> with untrusted content:</p>
      <div class="code-block">
        <pre><code>// DANGEROUS: XSS vulnerability!
element.innerHTML = userInput;

// DANGEROUS: Also in el() children
el('div').innerHTML = userInput;

// If you must use HTML, sanitize first:
import { escapeHtml } from 'pulse-js-framework/runtime/utils';

element.innerHTML = escapeHtml(userInput);
// Or use a sanitizer library for rich HTML</code></pre>
      </div>

      <h3>Safe Patterns for Dynamic Content</h3>
      <div class="code-block">
        <pre><code>import { el, text, bind } from 'pulse-js-framework';
import { escapeHtml, escapeAttribute, sanitizeUrl } from 'pulse-js-framework/runtime/utils';

// SAFE: Use text() for reactive text
const username = pulse('');
el('span', text(() => username.get()));

// SAFE: Use bind() for attributes
bind(element, 'title', () => username.get());

// SAFE: Sanitize URLs
const userUrl = pulse('javascript:alert(1)');
bind(link, 'href', () => sanitizeUrl(userUrl.get()));
// Returns 'about:blank' for javascript: URLs

// SAFE: For data URLs (images), explicitly allow:
sanitizeUrl(dataUrl, { allowData: true });</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('security.urlSanitization')}</h2>
      <p>Always sanitize user-provided URLs before using them in links or redirects:</p>

      <div class="code-block">
        <pre><code>import { sanitizeUrl } from 'pulse-js-framework/runtime/utils';

// Blocked protocols
sanitizeUrl('javascript:alert(1)');  // 'about:blank'
sanitizeUrl('vbscript:msgbox(1)');   // 'about:blank'
sanitizeUrl('data:text/html,...');    // 'about:blank' (default)

// Allowed protocols
sanitizeUrl('https://example.com');   // 'https://example.com'
sanitizeUrl('http://example.com');    // 'http://example.com'
sanitizeUrl('/relative/path');        // '/relative/path'
sanitizeUrl('path/to/page');          // 'path/to/page'

// Allow data URLs explicitly (for images)
sanitizeUrl('data:image/png;base64,...', { allowData: true });</code></pre>
      </div>

      <h3>Router Navigation</h3>
      <div class="code-block">
        <pre><code>// SAFE: Router validates paths internally
router.navigate('/users/' + userId);

// DANGEROUS: Open redirect if userId is a full URL
const userId = '//evil.com/phishing';
router.navigate('/users/' + userId);
// Could redirect to evil.com!

// SAFE: Validate user input
function safeNavigate(path) {
  // Ensure path is relative and doesn't start with //
  if (path.startsWith('//') || path.includes('://')) {
    console.error('Invalid redirect attempted');
    return;
  }
  router.navigate(path);
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('security.formSecurity')}</h2>
      <p>Secure handling of form data:</p>

      <h3>Input Validation</h3>
      <div class="code-block">
        <pre><code>import { useForm, validators } from 'pulse-js-framework/runtime/form';

const { fields, handleSubmit } = useForm(
  { email: '', password: '' },
  {
    email: [
      validators.required('Email is required'),
      validators.email('Invalid email format'),
      // Custom validation
      validators.custom((value) => {
        if (value.includes('<')) return 'Invalid characters';
        return true;
      })
    ],
    password: [
      validators.required(),
      validators.minLength(8, 'Password must be at least 8 characters'),
      validators.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/,
        'Must include uppercase, lowercase, and number'
      )
    ]
  }
);</code></pre>
      </div>

      <h3>Sensitive Data Handling</h3>
      <div class="code-block">
        <pre><code>// DON'T store sensitive data in pulses that persist
const store = createStore({
  user: null,
  // NEVER persist tokens in localStorage!
}, { persist: true });

// DO use memory-only storage for sensitive data
const authToken = pulse(null);  // Not persisted

// Clear sensitive data on logout
function logout() {
  authToken.set(null);
  // Clear from memory
  sessionStorage.clear();
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('security.csp')}</h2>
      <p>Recommended CSP headers for Pulse applications:</p>

      <div class="code-block">
        <pre><code>// Recommended CSP header
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';  // Required for dynamic styles
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';

// For development with HMR, you may need:
script-src 'self' 'unsafe-eval';  // Remove in production!</code></pre>
      </div>

      <h3>Vite Configuration</h3>
      <div class="code-block">
        <pre><code>// vite.config.js
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'"
    }
  }
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('security.apiSecurity')}</h2>
      <p>Secure patterns for data fetching:</p>

      <div class="code-block">
        <pre><code>import { useAsync } from 'pulse-js-framework/runtime/async';

// Include CSRF token in requests
const { data, error } = useAsync(async () => {
  const response = await fetch('/api/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
    },
    credentials: 'same-origin',  // Include cookies
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Request failed');
  }

  return response.json();
});

// Validate API responses
function validateUserData(data) {
  if (typeof data.id !== 'number') throw new Error('Invalid user ID');
  if (typeof data.name !== 'string') throw new Error('Invalid name');
  // Sanitize before storing
  return {
    id: data.id,
    name: escapeHtml(data.name)
  };
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('security.checklist')}</h2>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Check</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>No <code>innerHTML</code> with user input</td>
            <td>Required</td>
            <td>Use <code>text()</code> or <code>escapeHtml()</code></td>
          </tr>
          <tr>
            <td>URLs sanitized before use</td>
            <td>Required</td>
            <td>Use <code>sanitizeUrl()</code></td>
          </tr>
          <tr>
            <td>Form inputs validated</td>
            <td>Required</td>
            <td>Use validators from form module</td>
          </tr>
          <tr>
            <td>CSP headers configured</td>
            <td>Recommended</td>
            <td>Blocks inline scripts</td>
          </tr>
          <tr>
            <td>HTTPS enforced</td>
            <td>Required</td>
            <td>Redirect HTTP to HTTPS</td>
          </tr>
          <tr>
            <td>Sensitive data not persisted</td>
            <td>Required</td>
            <td>Don't use persist: true for tokens</td>
          </tr>
          <tr>
            <td>CSRF tokens on mutations</td>
            <td>Recommended</td>
            <td>Include in POST/PUT/DELETE</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="next-section"></div>
  `;

  // Attach click handler programmatically for navigation button
  const nextSection = page.querySelector('.next-section');
  const nextBtn = el('button.btn.btn-primary', t('security.nextPerformance'));
  nextBtn.onclick = () => navigateLocale('/performance');
  nextSection.appendChild(nextBtn);

  return page;
}
