/**
 * Pulse Documentation - Error Handling Patterns
 */

import { el } from '/runtime/index.js';

export function ErrorHandlingPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>Error Handling Patterns</h1>
    <p class="intro">Robust error handling strategies for Pulse applications</p>

    <section class="doc-section">
      <h2>Effect Error Handling</h2>
      <p>Effects can fail. Handle errors gracefully to prevent app crashes:</p>

      <h3>Per-Effect Error Handler</h3>
      <div class="code-block">
        <pre><code>import { effect } from 'pulse-js-framework';

// Option 1: onError callback
effect(
  () => {
    const data = riskyOperation(input.get());
    display(data);
  },
  {
    onError: (error) => {
      console.error('Effect failed:', error.message);
      showErrorToast('Something went wrong');
    }
  }
);

// Option 2: Try-catch inside effect
effect(() => {
  try {
    const data = riskyOperation(input.get());
    display(data);
  } catch (error) {
    errorState.set(error.message);
  }
});</code></pre>
      </div>

      <h3>Global Effect Error Handler</h3>
      <div class="code-block">
        <pre><code>import { setGlobalEffectErrorHandler } from 'pulse-js-framework';

// Set up global handler for uncaught effect errors
setGlobalEffectErrorHandler((error) => {
  // Log to error tracking service
  errorTracker.capture(error);

  // Show user-friendly message
  if (error.phase === 'execution') {
    showToast('An error occurred. Please refresh.');
  }

  // Access error context
  console.error({
    effectId: error.effectId,
    phase: error.phase,  // 'execution' or 'cleanup'
    dependencies: error.dependencyCount,
    originalError: error.cause
  });
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Async Error Handling</h2>
      <p>The async module provides built-in error state management:</p>

      <div class="code-block">
        <pre><code>import { useAsync, useResource } from 'pulse-js-framework/runtime/async';

// useAsync with error handling
const { data, error, loading, execute } = useAsync(
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}\`);
    }
    return response.json();
  },
  {
    onError: (err) => {
      // Called when request fails
      console.error('Fetch failed:', err);
      showNotification('Failed to load data');
    },
    onSuccess: (data) => {
      console.log('Loaded:', data);
    },
    retries: 3,        // Retry up to 3 times
    retryDelay: 1000   // Wait 1s between retries
  }
);

// Display error state in UI
effect(() => {
  const err = error.get();
  if (err) {
    errorMessage.set(err.message);
  }
});</code></pre>
      </div>

      <h3>useResource with Fallback</h3>
      <div class="code-block">
        <pre><code>const users = useResource(
  'users',
  async () => {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to load users');
    return res.json();
  },
  {
    initialData: [],  // Fallback data while loading/on error
    onError: (err) => {
      // Still shows cached data if available
      console.error('Refresh failed, showing stale data');
    }
  }
);

// UI handles all states
when(
  () => users.loading.get(),
  () => el('.spinner'),
  () => when(
    () => users.error.get(),
    () => el('.error',
      'Failed to load. ',
      el('button', { onclick: () => users.refresh() }, 'Retry')
    ),
    () => list(users.data, item => el('li', item.name))
  )
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Form Validation Errors</h2>
      <p>Handle form validation with the form module:</p>

      <div class="code-block">
        <pre><code>import { useForm, validators } from 'pulse-js-framework/runtime/form';

const { fields, handleSubmit, errors, isValid } = useForm(
  { email: '', password: '' },
  {
    email: [
      validators.required('Email is required'),
      validators.email('Please enter a valid email')
    ],
    password: [
      validators.required('Password is required'),
      validators.minLength(8, 'Password must be at least 8 characters')
    ]
  },
  {
    // Called when validation fails
    onError: (errors) => {
      console.log('Validation failed:', errors);
      // Focus first field with error
      const firstError = Object.keys(errors)[0];
      document.querySelector(\`[name="\${firstError}"]\`)?.focus();
    },
    // Called on successful submit
    onSubmit: async (values) => {
      try {
        await api.login(values);
        router.navigate('/dashboard');
      } catch (err) {
        // Set server-side errors
        if (err.code === 'INVALID_CREDENTIALS') {
          fields.password.setError('Invalid email or password');
        }
      }
    }
  }
);

// Display field errors
el('input', {
  name: 'email',
  oninput: fields.email.onChange,
  onblur: fields.email.onBlur
});
when(
  () => fields.email.error.get(),
  () => el('.error-message', text(() => fields.email.error.get()))
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Router Error Handling</h2>
      <p>Handle navigation and route loading errors:</p>

      <div class="code-block">
        <pre><code>import { createRouter, lazy } from 'pulse-js-framework/runtime/router';

const router = createRouter({
  routes: {
    '/': HomePage,

    // Lazy route with error handling
    '/dashboard': lazy(
      () => import('./Dashboard.js'),
      {
        error: (err) => {
          console.error('Failed to load Dashboard:', err);
          return el('.error-page',
            el('h1', 'Failed to Load'),
            el('p', err.message),
            el('button', { onclick: () => location.reload() }, 'Reload')
          );
        },
        timeout: 10000  // Timeout after 10s
      }
    ),

    // Catch-all for 404
    '/*path': () => NotFoundPage()
  }
});

// Global guard for auth errors
router.beforeEach((to, from) => {
  try {
    if (to.meta?.requiresAuth && !isAuthenticated()) {
      return '/login?redirect=' + encodeURIComponent(to.path);
    }
    return true;
  } catch (err) {
    console.error('Guard error:', err);
    return '/error';  // Redirect to error page
  }
});

// Handle navigation errors
router.afterEach((to) => {
  // Track page views, handle analytics errors gracefully
  try {
    analytics.pageView(to.path);
  } catch (err) {
    console.warn('Analytics failed:', err);
    // Don't break navigation for analytics errors
  }
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Error Boundaries</h2>
      <p>Contain errors to prevent entire app crashes:</p>

      <div class="code-block">
        <pre><code>import { errorBoundary } from 'pulse-js-framework';

// Wrap components that might fail
const safeWidget = errorBoundary(
  // Children (normal render)
  () => RiskyWidget(),

  // Error fallback
  (error) => el('.widget-error',
    el('p', 'Widget failed to render'),
    el('code', error.message),
    el('button', {
      onclick: () => {
        // Reset error state and retry
        safeWidget.reset();
      }
    }, 'Retry')
  )
);

// Mount the error-bounded widget
mount(safeWidget, document.getElementById('widget-container'));

// Create reusable error boundary component
function withErrorBoundary(component, fallback) {
  return (...props) => errorBoundary(
    () => component(...props),
    fallback || ((err) => el('.error', 'Something went wrong'))
  );
}

const SafeUserProfile = withErrorBoundary(UserProfile);
mount(SafeUserProfile({ userId: 123 }), container);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Error Logging & Reporting</h2>
      <p>Integrate with error tracking services:</p>

      <div class="code-block">
        <pre><code>import { setGlobalEffectErrorHandler } from 'pulse-js-framework';
import { createLogger, setLogLevel, LogLevel } from 'pulse-js-framework/runtime/logger';

const errorLog = createLogger('Error');

// Production error handler
if (import.meta.env.PROD) {
  // Capture unhandled errors
  window.onerror = (msg, url, line, col, error) => {
    sendToErrorService({
      type: 'unhandled',
      message: msg,
      stack: error?.stack,
      url, line, col
    });
    return false;  // Don't suppress default handling
  };

  // Capture promise rejections
  window.onunhandledrejection = (event) => {
    sendToErrorService({
      type: 'unhandledRejection',
      reason: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    });
  };

  // Capture effect errors
  setGlobalEffectErrorHandler((error) => {
    sendToErrorService({
      type: 'effectError',
      effectId: error.effectId,
      phase: error.phase,
      message: error.message,
      stack: error.cause?.stack
    });
  });
}

// Error service integration
async function sendToErrorService(error) {
  try {
    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...error,
        timestamp: Date.now(),
        url: location.href,
        userAgent: navigator.userAgent
      })
    });
  } catch (err) {
    // Fallback to console if reporting fails
    console.error('Failed to report error:', err);
  }
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Graceful Degradation</h2>
      <p>Patterns for maintaining functionality when parts fail:</p>

      <div class="code-block">
        <pre><code>// Feature with fallback
const analyticsEnabled = pulse(true);

function trackEvent(name, data) {
  if (!analyticsEnabled.get()) return;

  try {
    analytics.track(name, data);
  } catch (err) {
    console.warn('Analytics disabled due to error');
    analyticsEnabled.set(false);  // Disable to prevent spam
  }
}

// Cached data fallback
const cachedData = localStorage.getItem('lastKnownData');
const data = useResource(
  'data',
  () => fetch('/api/data').then(r => r.json()),
  {
    initialData: cachedData ? JSON.parse(cachedData) : null,
    onSuccess: (data) => {
      // Cache for offline use
      localStorage.setItem('lastKnownData', JSON.stringify(data));
    }
  }
);

// Retry with exponential backoff
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      throw new Error(\`HTTP \${res.status}\`);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      // Exponential backoff: 1s, 2s, 4s...
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Error Handling Patterns Summary</h2>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Context</th>
            <th>Pattern</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Effects</td>
            <td>onError option or try-catch</td>
            <td><code>effect(fn, { onError })</code></td>
          </tr>
          <tr>
            <td>Async operations</td>
            <td>useAsync with onError</td>
            <td><code>useAsync(fn, { onError, retries })</code></td>
          </tr>
          <tr>
            <td>Forms</td>
            <td>Validation + setError</td>
            <td><code>field.setError('Server error')</code></td>
          </tr>
          <tr>
            <td>Routes</td>
            <td>Error component + guards</td>
            <td><code>lazy(fn, { error: Component })</code></td>
          </tr>
          <tr>
            <td>Components</td>
            <td>Error boundaries</td>
            <td><code>errorBoundary(children, fallback)</code></td>
          </tr>
          <tr>
            <td>Global</td>
            <td>Window error handlers</td>
            <td><code>window.onerror</code></td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('/api-reference')">
        Next: API Reference
      </button>
    </div>
  `;

  return page;
}
