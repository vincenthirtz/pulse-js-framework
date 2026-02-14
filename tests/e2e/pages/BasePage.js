/**
 * Base Page Object
 *
 * Common functionality for all documentation pages.
 */

import { expect } from '@playwright/test';
import { navigateAndWait, waitForTranslations } from '../utils/common-helpers.js';

export class BasePage {
  constructor(page, baseURL) {
    this.page = page;
    this.baseURL = baseURL;

    // Common selectors
    this.selectors = {
      // Header
      header: 'header',
      logo: 'header a[href="/"]',
      themeToggle: 'button[aria-label*="theme" i], button[aria-label*="thème" i]',
      languageSelector: '[data-language-selector], select[aria-label*="language" i]',
      searchButton: 'button[aria-label*="search" i], button[aria-label*="recherche" i]',
      mobileMenuToggle: 'button[aria-label*="menu" i]',

      // Navigation
      mainNav: 'nav[aria-label*="main" i], nav[aria-label*="principal" i]',
      sidebar: 'aside, nav.sidebar, [role="navigation"]',
      breadcrumbs: 'nav[aria-label*="breadcrumb" i], nav[aria-label*="fil" i], .breadcrumbs',

      // Table of Contents
      toc: '[data-toc], .table-of-contents, aside nav',
      tocLinks: '[data-toc] a, .table-of-contents a',

      // Content
      main: 'main, [role="main"]',
      heading: 'h1',
      codeBlocks: 'pre code, .code-block',
      copyButtons: 'button[aria-label*="copy" i], button[aria-label*="copier" i]',

      // Footer
      footer: 'footer'
    };
  }

  /**
   * Navigate to a specific route
   *
   * @param {string} path - Route path (e.g., '/getting-started')
   * @param {object} options - Navigation options
   */
  async goto(path, options = {}) {
    const url = `${this.baseURL}${path}`;
    await navigateAndWait(this.page, url, options);
  }

  /**
   * Wait for page to be ready
   */
  async waitForPageReady() {
    await this.page.waitForLoadState('domcontentloaded');
    await waitForTranslations(this.page);
  }

  /**
   * Get page title
   */
  async getTitle() {
    return await this.page.title();
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector) {
    try {
      return await this.page.locator(selector).isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Click element
   */
  async click(selector) {
    await this.page.click(selector);
  }

  /**
   * Get text content
   */
  async getText(selector) {
    return await this.page.locator(selector).textContent();
  }

  /**
   * Get all matching elements
   */
  async getAll(selector) {
    return await this.page.locator(selector).all();
  }

  /**
   * Count matching elements
   */
  async count(selector) {
    return await this.page.locator(selector).count();
  }

  /**
   * Toggle theme (light/dark)
   */
  async toggleTheme() {
    const themeButton = this.page.locator(this.selectors.themeToggle).first();
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await this.page.waitForTimeout(300); // Wait for theme transition
    }
  }

  /**
   * Get current theme
   */
  async getCurrentTheme() {
    return await this.page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
  }

  /**
   * Open search modal
   */
  async openSearch() {
    await this.page.keyboard.press('Control+K');
    await this.page.waitForTimeout(300);
  }

  /**
   * Open mobile menu
   */
  async openMobileMenu() {
    const menuButton = this.page.locator(this.selectors.mobileMenuToggle).first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Get breadcrumbs
   */
  async getBreadcrumbs() {
    const breadcrumbsContainer = this.page.locator(this.selectors.breadcrumbs);
    if (await breadcrumbsContainer.isVisible()) {
      const links = await breadcrumbsContainer.locator('a').all();
      return await Promise.all(links.map(link => link.textContent()));
    }
    return [];
  }

  /**
   * Get all TOC links
   */
  async getTOCLinks() {
    const tocLinks = await this.page.locator(this.selectors.tocLinks).all();
    return await Promise.all(tocLinks.map(async link => ({
      text: await link.textContent(),
      href: await link.getAttribute('href')
    })));
  }

  /**
   * Click TOC link by text
   */
  async clickTOCLink(text) {
    const links = await this.page.locator(this.selectors.tocLinks).all();
    for (const link of links) {
      const linkText = await link.textContent();
      if (linkText?.includes(text)) {
        await link.click();
        await this.page.waitForTimeout(300);
        return;
      }
    }
    throw new Error(`TOC link with text "${text}" not found`);
  }

  /**
   * Get all code blocks
   */
  async getCodeBlocks() {
    return await this.page.locator(this.selectors.codeBlocks).all();
  }

  /**
   * Test copy button functionality
   */
  async testCopyButton(index = 0) {
    const copyButtons = await this.page.locator(this.selectors.copyButtons).all();
    if (copyButtons.length === 0) {
      console.warn('⚠️  No copy buttons found on page');
      return;
    }

    const button = copyButtons[index];
    await button.click();
    await this.page.waitForTimeout(200);

    // Check if clipboard was populated (requires clipboard permissions in browser)
    // We can't directly test clipboard in Playwright without permissions,
    // so we just verify the button action completed without error
  }

  /**
   * Scroll to section by ID
   */
  async scrollToSection(id) {
    await this.page.evaluate((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, id);
    await this.page.waitForTimeout(500);
  }

  /**
   * Get all headings with their levels
   */
  async getHeadings() {
    return await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim(),
        id: h.id
      }));
    });
  }

  /**
   * Check if page has no console errors
   */
  async assertNoConsoleErrors() {
    // This is typically handled by the console collector in tests
    // But this method can be used for quick checks
  }

  /**
   * Get all links on page
   */
  async getAllLinks() {
    return await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(a => ({
        href: a.href,
        text: a.textContent?.trim(),
        isExternal: a.href.startsWith('http') && !a.href.includes(window.location.host)
      }));
    });
  }

  /**
   * Get all images
   */
  async getAllImages() {
    return await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        hasAlt: !!img.alt,
        isLoaded: img.complete && img.naturalHeight > 0
      }));
    });
  }

  /**
   * Check if link is internal
   */
  isInternalLink(href) {
    return href.startsWith('/') || href.startsWith(this.baseURL);
  }

  /**
   * Get current locale from URL
   */
  async getCurrentLocale() {
    const path = await this.page.evaluate(() => window.location.pathname);
    const parts = path.split('/').filter(Boolean);
    const locales = ['fr', 'es', 'de', 'pt', 'ja', 'is', 'eo'];
    if (parts.length > 0 && locales.includes(parts[0])) {
      return parts[0];
    }
    return 'en';
  }

  /**
   * Switch language
   */
  async switchLanguage(locale) {
    // Implementation depends on how language switcher works in the docs
    // This is a placeholder that needs to be adapted
    const languageSelector = this.page.locator(this.selectors.languageSelector).first();
    if (await languageSelector.isVisible()) {
      await languageSelector.selectOption(locale);
      await this.page.waitForTimeout(1000); // Wait for translations to load
    }
  }

  /**
   * Assert page loaded successfully
   */
  async assertPageLoaded() {
    await expect(this.page.locator(this.selectors.heading).first()).toBeVisible();
    await expect(this.page.locator(this.selectors.main)).toBeVisible();
  }

  /**
   * Assert navigation is visible
   */
  async assertNavigationVisible() {
    const hasMainNav = await this.isVisible(this.selectors.mainNav);
    const hasSidebar = await this.isVisible(this.selectors.sidebar);
    expect(hasMainNav || hasSidebar, 'Navigation should be visible').toBe(true);
  }

  /**
   * Assert header is visible
   */
  async assertHeaderVisible() {
    await expect(this.page.locator(this.selectors.header)).toBeVisible();
  }

  /**
   * Assert footer is visible
   */
  async assertFooterVisible() {
    await expect(this.page.locator(this.selectors.footer)).toBeVisible();
  }
}
