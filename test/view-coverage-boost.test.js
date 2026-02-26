/**
 * Coverage boost tests for compiler/transformer/view.js
 *
 * Targets uncovered paths:
 *  - @client directive → ClientOnly()
 *  - @server directive → ServerOnly()
 *  - @srOnly directive → srOnly() call
 *  - @srOnly with no content → srOnly('')
 *  - @focusTrap directive → trapFocus()
 *  - Dynamic attribute with interpolation → bind() with template literal
 *  - Static boolean attribute [disabled]
 *  - Component with named slot
 *  - Event modifier combinations (@click.prevent.stop)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { compile } from '../compiler/index.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Compile a minimal .pulse source and return the generated code string.
 * Throws the first compilation error if compilation fails.
 */
function compileSource(source) {
  const result = compile(source, { runtime: 'pulse-js-framework/runtime' });
  if (!result.success) {
    throw new Error(
      `Compilation failed: ${result.errors.map(e => e.message).join('; ')}`
    );
  }
  return result.code;
}

// ---------------------------------------------------------------------------
// @client directive → ClientOnly()
// ---------------------------------------------------------------------------

describe('view transformer - @client directive', () => {
  test('@client wraps element in ClientOnly()', () => {
    const source = `
@page Test

view {
  div @client {
    span "client content"
  }
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('ClientOnly'),
      `Expected ClientOnly() in output; got:\n${code}`
    );
  });

  test('@client without children still generates ClientOnly()', () => {
    const source = `
@page Test

view {
  div @client "only client"
}
`;
    const code = compileSource(source);
    assert.ok(code.includes('ClientOnly'), `Expected ClientOnly in output; got:\n${code}`);
  });
});

// ---------------------------------------------------------------------------
// @server directive → ServerOnly()
// ---------------------------------------------------------------------------

describe('view transformer - @server directive', () => {
  test('@server wraps element in ServerOnly()', () => {
    const source = `
@page Test

view {
  div @server {
    span "server content"
  }
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('ServerOnly'),
      `Expected ServerOnly() in output; got:\n${code}`
    );
  });
});

// ---------------------------------------------------------------------------
// @srOnly directive → srOnly()
// ---------------------------------------------------------------------------

describe('view transformer - @srOnly directive', () => {
  test('@srOnly with text content generates srOnly() call', () => {
    const source = `
@page Test

view {
  span @srOnly "Skip to main content"
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('srOnly'),
      `Expected srOnly() in output; got:\n${code}`
    );
    // The a11y import should include srOnly
    assert.ok(
      code.includes("from 'pulse-js-framework/runtime/a11y'"),
      `Expected a11y import in output; got:\n${code}`
    );
  });

  test('@srOnly with no text content generates srOnly(\'\')', () => {
    // When the element has no text content, the transformer should emit srOnly('')
    const source = `
@page Test

view {
  span @srOnly
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes("srOnly('')"),
      `Expected srOnly('') in output; got:\n${code}`
    );
  });
});

// ---------------------------------------------------------------------------
// @focusTrap directive → trapFocus()
// ---------------------------------------------------------------------------

describe('view transformer - @focusTrap directive', () => {
  test('@focusTrap without options generates trapFocus(el, {})', () => {
    const source = `
@page Test

view {
  div @focusTrap {
    button "Close"
  }
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('trapFocus'),
      `Expected trapFocus() in output; got:\n${code}`
    );
    // The a11y import should include trapFocus
    assert.ok(
      code.includes("from 'pulse-js-framework/runtime/a11y'"),
      `Expected a11y import in output; got:\n${code}`
    );
  });

  test('@focusTrap(autoFocus=true) includes options', () => {
    const source = `
@page Test

view {
  div @focusTrap(autoFocus=true) {
    button "Close"
  }
}
`;
    const code = compileSource(source);
    assert.ok(code.includes('trapFocus'), `Expected trapFocus in output; got:\n${code}`);
    assert.ok(
      code.includes('autoFocus'),
      `Expected autoFocus option in output; got:\n${code}`
    );
  });
});

// ---------------------------------------------------------------------------
// Dynamic attribute interpolation → bind() with template literal
// ---------------------------------------------------------------------------

describe('view transformer - dynamic attribute interpolation', () => {
  test('attribute with {expr} generates bind() call', () => {
    const source = `
@page Test

state {
  name: "world"
}

view {
  div[title="{name}"] "hello"
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('bind'),
      `Expected bind() for dynamic attribute; got:\n${code}`
    );
    assert.ok(
      code.includes("'title'"),
      `Expected 'title' attribute in bind() call; got:\n${code}`
    );
  });

  test('attribute with mixed static text and {expr} uses template literal', () => {
    const source = `
@page Test

state {
  id: "42"
}

view {
  div[aria-label="item-{id}"] "content"
}
`;
    const code = compileSource(source);
    // Should use a template literal (backtick) in the bind call
    assert.ok(
      code.includes('bind'),
      `Expected bind() for interpolated attribute; got:\n${code}`
    );
    assert.ok(
      code.includes('`'),
      `Expected template literal in interpolated attribute; got:\n${code}`
    );
  });
});

// ---------------------------------------------------------------------------
// Static boolean attribute [disabled]
// ---------------------------------------------------------------------------

describe('view transformer - static boolean attribute', () => {
  test('[disabled] attribute preserved as boolean true', () => {
    const source = `
@page Test

view {
  input[disabled]
}
`;
    const code = compileSource(source);
    // Boolean attribute should be passed as { 'disabled': true }
    assert.ok(
      code.includes('disabled'),
      `Expected disabled attribute in output; got:\n${code}`
    );
    assert.ok(
      code.includes('true'),
      `Expected true value for boolean attribute; got:\n${code}`
    );
  });

  test('[readonly] boolean attribute is preserved', () => {
    const source = `
@page Test

view {
  input[readonly]
}
`;
    const code = compileSource(source);
    assert.ok(code.includes('readonly'), `Expected readonly attribute; got:\n${code}`);
  });
});

// ---------------------------------------------------------------------------
// Named slot rendering
// ---------------------------------------------------------------------------

describe('view transformer - named slot', () => {
  test('named slot renders slot reference with slot name', () => {
    const source = `
@page Test

view {
  div {
    slot "header"
    slot "footer"
  }
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('slots?.header'),
      `Expected slots?.header reference; got:\n${code}`
    );
    assert.ok(
      code.includes('slots?.footer'),
      `Expected slots?.footer reference; got:\n${code}`
    );
  });

  test('default slot renders slots?.default', () => {
    const source = `
@page Test

view {
  div {
    slot
  }
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('slots?.default'),
      `Expected slots?.default reference; got:\n${code}`
    );
  });

  test('slot with fallback content renders fallback', () => {
    const source = `
@page Test

view {
  div {
    slot { "default content" }
  }
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('slots?.default'),
      `Expected slots?.default in slot with fallback; got:\n${code}`
    );
    assert.ok(
      code.includes('"default content"'),
      `Expected fallback content in output; got:\n${code}`
    );
  });
});

// ---------------------------------------------------------------------------
// Event modifier combinations
// ---------------------------------------------------------------------------

describe('view transformer - event modifier combinations', () => {
  test('@click.prevent.stop generates preventDefault and stopPropagation', () => {
    const source = `
@page Test

view {
  button @click.prevent.stop(doSomething()) "click me"
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('preventDefault'),
      `Expected event.preventDefault() in output; got:\n${code}`
    );
    assert.ok(
      code.includes('stopPropagation'),
      `Expected event.stopPropagation() in output; got:\n${code}`
    );
  });

  test('@submit.prevent generates only preventDefault', () => {
    const source = `
@page Test

view {
  form @submit.prevent(handleSubmit()) {
    button "submit"
  }
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('preventDefault'),
      `Expected event.preventDefault() in output; got:\n${code}`
    );
  });

  test('@click.stop generates only stopPropagation', () => {
    const source = `
@page Test

view {
  div @click.stop(doNothing()) "click"
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('stopPropagation'),
      `Expected event.stopPropagation() in output; got:\n${code}`
    );
    // Should NOT have preventDefault since .prevent was not specified
    assert.ok(
      !code.includes('preventDefault'),
      `Expected NO event.preventDefault() when .prevent is absent; got:\n${code}`
    );
  });

  test('@click.once generates once: true option', () => {
    const source = `
@page Test

view {
  button @click.once(init()) "init"
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('once'),
      `Expected once:true option for @click.once; got:\n${code}`
    );
  });
});

// ---------------------------------------------------------------------------
// @live directive
// ---------------------------------------------------------------------------

describe('view transformer - @live directive', () => {
  test('@live(polite) adds aria-live=polite attribute', () => {
    const source = `
@page Test

state {
  status: ""
}

view {
  div @live(polite) "Status: {status}"
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('aria-live'),
      `Expected aria-live attribute in output; got:\n${code}`
    );
    assert.ok(
      code.includes('polite'),
      `Expected polite value for aria-live; got:\n${code}`
    );
    assert.ok(
      code.includes('aria-atomic'),
      `Expected aria-atomic attribute in output; got:\n${code}`
    );
  });

  test('@live(assertive) adds aria-live=assertive', () => {
    const source = `
@page Test

view {
  div @live(assertive) "Error!"
}
`;
    const code = compileSource(source);
    assert.ok(code.includes('assertive'), `Expected assertive value; got:\n${code}`);
  });
});

// ---------------------------------------------------------------------------
// @a11y directive
// ---------------------------------------------------------------------------

describe('view transformer - @a11y directive', () => {
  test('@a11y(role=dialog) generates role attribute', () => {
    const source = `
@page Test

view {
  div @a11y(role=dialog) {
    "modal content"
  }
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('role'),
      `Expected role attribute in output; got:\n${code}`
    );
    assert.ok(
      code.includes('dialog'),
      `Expected dialog value in output; got:\n${code}`
    );
  });

  test('@a11y(label="Close menu") generates aria-label', () => {
    const source = `
@page Test

view {
  button @a11y(label="Close menu") "X"
}
`;
    const code = compileSource(source);
    assert.ok(
      code.includes('aria-label'),
      `Expected aria-label attribute; got:\n${code}`
    );
    assert.ok(
      code.includes('Close menu'),
      `Expected label value; got:\n${code}`
    );
  });
});
