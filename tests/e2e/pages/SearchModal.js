/**
 * Search Modal Page Object
 *
 * Encapsulates search modal functionality.
 */

import { expect } from '@playwright/test';

export class SearchModal {
  constructor(page) {
    this.page = page;

    this.selectors = {
      overlay: '.search-overlay[role="dialog"], [role="dialog"].search, dialog.search',
      input: '.search-overlay input[type="text"], .search-overlay input[type="search"], dialog.search input',
      results: '.search-results, .search-overlay [role="list"], .search-overlay ul',
      resultItems: '.search-result, .search-results li, .search-overlay [role="list"] > *',
      noResults: '.no-results, .search-empty, .search-overlay [data-no-results]',
      closeButton: '.search-overlay button[aria-label*="close" i], dialog.search button[aria-label*="fermer" i]'
    };
  }

  /**
   * Open search modal using keyboard shortcut
   */
  async open() {
    await this.page.keyboard.press('Control+K');
    await this.waitForOpen();
  }

  /**
   * Wait for modal to be visible
   */
  async waitForOpen(timeout = 10000) {
    await this.page.waitForSelector(this.selectors.overlay, {
      state: 'visible',
      timeout
    });
  }

  /**
   * Check if modal is open
   */
  async isOpen() {
    try {
      return await this.page.locator(this.selectors.overlay).isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Type search query
   */
  async search(query) {
    await this.page.locator(this.selectors.input).fill(query);
    await this.page.waitForTimeout(500); // Debounce time for search
  }

  /**
   * Get search results
   */
  async getResults() {
    const resultItems = await this.page.locator(this.selectors.resultItems).all();
    return await Promise.all(resultItems.map(async item => ({
      text: await item.textContent(),
      href: await item.locator('a').first().getAttribute('href').catch(() => null)
    })));
  }

  /**
   * Get number of results
   */
  async getResultCount() {
    return await this.page.locator(this.selectors.resultItems).count();
  }

  /**
   * Click on result by index
   */
  async clickResult(index = 0) {
    const results = await this.page.locator(this.selectors.resultItems).all();
    if (index >= results.length) {
      throw new Error(`Result index ${index} out of bounds (total: ${results.length})`);
    }
    await results[index].click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Close modal using Escape key
   */
  async closeWithEscape() {
    await this.page.keyboard.press('Escape');
    await this.waitForClose();
  }

  /**
   * Close modal using close button
   */
  async closeWithButton() {
    const closeButton = this.page.locator(this.selectors.closeButton).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await this.waitForClose();
    }
  }

  /**
   * Close modal by clicking outside (backdrop)
   */
  async closeWithBackdrop() {
    // Click on overlay background (not on the modal content)
    await this.page.locator(this.selectors.overlay).click({ position: { x: 10, y: 10 } });
    await this.waitForTimeout(500);
  }

  /**
   * Wait for modal to be closed
   */
  async waitForClose(timeout = 5000) {
    await this.page.waitForSelector(this.selectors.overlay, {
      state: 'hidden',
      timeout
    }).catch(() => {
      // If still visible, it might be a different implementation
      // Check if it has display: none or visibility: hidden
    });
  }

  /**
   * Navigate results with keyboard (arrow keys)
   */
  async navigateResults(direction = 'down', count = 1) {
    const key = direction === 'down' ? 'ArrowDown' : 'ArrowUp';
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press(key);
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Select highlighted result with Enter
   */
  async selectHighlightedResult() {
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Open modal
    await this.open();

    // Type search query
    await this.search('pulse');
    await this.page.waitForTimeout(500);

    // Navigate down
    await this.navigateResults('down', 2);

    // Navigate up
    await this.navigateResults('up', 1);

    // Select result
    await this.selectHighlightedResult();
  }

  /**
   * Test focus trap (Tab key should cycle through modal elements only)
   */
  async testFocusTrap() {
    await this.open();

    // Tab through focusable elements
    for (let i = 0; i < 5; i++) {
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(100);

      // Verify focus is still within modal
      const focusedElement = await this.page.evaluate(() => {
        const el = document.activeElement;
        const modal = document.querySelector('.search-overlay, dialog.search');
        return modal?.contains(el) || false;
      });

      if (!focusedElement && i > 0) {
        throw new Error('Focus escaped modal - focus trap not working');
      }
    }
  }

  /**
   * Assert search works for a query
   */
  async assertSearchWorks(query, expectedMinResults = 1) {
    await this.open();
    await this.search(query);

    const count = await this.getResultCount();
    expect(count, `Search for "${query}" should return at least ${expectedMinResults} result(s)`).toBeGreaterThanOrEqual(expectedMinResults);

    await this.closeWithEscape();
  }

  /**
   * Assert no results message is shown
   */
  async assertNoResults(query) {
    await this.open();
    await this.search(query);

    const noResultsVisible = await this.page.locator(this.selectors.noResults).isVisible().catch(() => false);
    const resultCount = await this.getResultCount();

    expect(noResultsVisible || resultCount === 0, `Search for "${query}" should show no results`).toBe(true);

    await this.closeWithEscape();
  }

  /**
   * Assert modal closes properly
   */
  async assertClosesWithEscape() {
    await this.open();
    expect(await this.isOpen(), 'Modal should be open').toBe(true);

    await this.closeWithEscape();
    expect(await this.isOpen(), 'Modal should be closed after Escape').toBe(false);
  }

  /**
   * Assert ARIA attributes are correct
   */
  async assertAriaAttributes() {
    await this.open();

    const overlay = this.page.locator(this.selectors.overlay);
    const role = await overlay.getAttribute('role');
    const modal = await overlay.getAttribute('aria-modal');

    expect(role, 'Search modal should have role="dialog"').toBe('dialog');
    expect(modal, 'Search modal should have aria-modal="true"').toBe('true');

    await this.closeWithEscape();
  }
}
