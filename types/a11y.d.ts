/**
 * Pulse A11y - TypeScript Definitions
 * Accessibility utilities for inclusive web applications
 */

import { Pulse } from './pulse';

// =============================================================================
// LIVE REGIONS
// =============================================================================

export interface AnnounceOptions {
  /** Announcement priority (default: 'polite') */
  priority?: 'polite' | 'assertive';
  /** Clear message after ms (default: 1000, 0 = never) */
  clearAfter?: number;
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, options?: AnnounceOptions): void;

/**
 * Announce politely (waits for user to finish current task)
 */
export function announcePolite(message: string): void;

/**
 * Announce assertively (interrupts current announcement)
 */
export function announceAssertive(message: string): void;

/**
 * Create a reactive live region that announces when value changes
 */
export function createLiveAnnouncer(
  getter: () => string | null | undefined,
  options?: AnnounceOptions
): () => void;

// =============================================================================
// FOCUS MANAGEMENT
// =============================================================================

export interface TrapFocusOptions {
  /** Auto focus first element (default: true) */
  autoFocus?: boolean;
  /** Return focus on release (default: true) */
  returnFocus?: boolean;
  /** Element to focus initially */
  initialFocus?: HTMLElement | null;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[];

/**
 * Focus the first focusable element in a container
 */
export function focusFirst(container: HTMLElement): HTMLElement | null;

/**
 * Focus the last focusable element in a container
 */
export function focusLast(container: HTMLElement): HTMLElement | null;

/**
 * Trap focus within a container (for modals, dialogs)
 * @returns Release function to remove trap
 */
export function trapFocus(
  container: HTMLElement,
  options?: TrapFocusOptions
): () => void;

/**
 * Save current focus to stack
 */
export function saveFocus(): void;

/**
 * Restore focus from stack
 */
export function restoreFocus(): void;

/**
 * Clear focus stack
 */
export function clearFocusStack(): void;

// =============================================================================
// SKIP LINKS
// =============================================================================

export interface SkipLinkOptions {
  /** CSS class name */
  className?: string;
}

/**
 * Create a skip link for keyboard navigation
 */
export function createSkipLink(
  targetId: string,
  text?: string,
  options?: SkipLinkOptions
): HTMLAnchorElement;

export interface SkipLinkDefinition {
  target: string;
  text: string;
}

/**
 * Install skip links at the beginning of the document
 */
export function installSkipLinks(links: SkipLinkDefinition[]): HTMLElement;

// =============================================================================
// USER PREFERENCES
// =============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean;

/**
 * Check user's preferred color scheme
 */
export function prefersColorScheme(): 'light' | 'dark' | 'no-preference';

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean;

export interface UserPreferences {
  reducedMotion: Pulse<boolean>;
  colorScheme: Pulse<'light' | 'dark' | 'no-preference'>;
  highContrast: Pulse<boolean>;
}

/**
 * Create reactive user preferences pulse
 */
export function createPreferences(): UserPreferences;

// =============================================================================
// ARIA HELPERS
// =============================================================================

/**
 * Set multiple ARIA attributes on an element
 * @param attrs - ARIA attributes without 'aria-' prefix
 */
export function setAriaAttributes(
  element: HTMLElement,
  attrs: Record<string, string | number | boolean | null | undefined>
): void;

export interface DisclosureOptions {
  /** Start in open state */
  defaultOpen?: boolean;
  /** Callback when toggled */
  onToggle?: (isOpen: boolean) => void;
}

export interface DisclosureControl {
  expanded: Pulse<boolean>;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

/**
 * Create an ARIA-compliant disclosure widget
 */
export function createDisclosure(
  trigger: HTMLElement,
  content: HTMLElement,
  options?: DisclosureOptions
): DisclosureControl;

export interface TabsOptions {
  /** Initially selected tab index */
  defaultIndex?: number;
  /** Tab orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Callback when tab selected */
  onSelect?: (index: number) => void;
}

export interface TabsControl {
  selectedIndex: Pulse<number>;
  select: (index: number) => void;
  tabs: HTMLElement[];
  panels: (HTMLElement | null)[];
}

/**
 * Create ARIA-compliant tabs
 */
export function createTabs(
  tablist: HTMLElement,
  options?: TabsOptions
): TabsControl;

// =============================================================================
// KEYBOARD NAVIGATION
// =============================================================================

export interface RovingTabindexOptions {
  /** Selector for items */
  selector?: string;
  /** Navigation orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Loop navigation */
  loop?: boolean;
  /** Selection callback */
  onSelect?: (element: HTMLElement, index: number) => void;
}

/**
 * Handle arrow key navigation within a container (roving tabindex)
 * @returns Cleanup function
 */
export function createRovingTabindex(
  container: HTMLElement,
  options?: RovingTabindexOptions
): () => void;

// =============================================================================
// VALIDATION & AUDITING
// =============================================================================

export interface A11yIssue {
  severity: 'error' | 'warning';
  rule: string;
  message: string;
  element: HTMLElement;
}

/**
 * Validate accessibility of a container
 */
export function validateA11y(container?: HTMLElement): A11yIssue[];

/**
 * Log validation results to console
 */
export function logA11yIssues(issues: A11yIssue[]): void;

/**
 * Highlight elements with accessibility issues in the DOM
 * @returns Cleanup function to remove highlights
 */
export function highlightA11yIssues(issues: A11yIssue[]): () => void;

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate a unique ID for ARIA relationships
 */
export function generateId(prefix?: string): string;

/**
 * Check if an element is visible to screen readers
 */
export function isAccessiblyHidden(element: HTMLElement | null): boolean;

/**
 * Make an element inert (non-interactive, hidden from a11y tree)
 * @returns Restore function
 */
export function makeInert(element: HTMLElement): () => void;

/**
 * Create screen reader only text (visually hidden)
 */
export function srOnly(text: string): HTMLSpanElement;

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export interface PulseA11y {
  // Announcements
  announce: typeof announce;
  announcePolite: typeof announcePolite;
  announceAssertive: typeof announceAssertive;
  createLiveAnnouncer: typeof createLiveAnnouncer;

  // Focus
  trapFocus: typeof trapFocus;
  focusFirst: typeof focusFirst;
  focusLast: typeof focusLast;
  saveFocus: typeof saveFocus;
  restoreFocus: typeof restoreFocus;
  getFocusableElements: typeof getFocusableElements;

  // Skip links
  createSkipLink: typeof createSkipLink;
  installSkipLinks: typeof installSkipLinks;

  // Preferences
  prefersReducedMotion: typeof prefersReducedMotion;
  prefersColorScheme: typeof prefersColorScheme;
  prefersHighContrast: typeof prefersHighContrast;
  createPreferences: typeof createPreferences;

  // ARIA helpers
  setAriaAttributes: typeof setAriaAttributes;
  createDisclosure: typeof createDisclosure;
  createTabs: typeof createTabs;
  createRovingTabindex: typeof createRovingTabindex;

  // Validation
  validateA11y: typeof validateA11y;
  logA11yIssues: typeof logA11yIssues;
  highlightA11yIssues: typeof highlightA11yIssues;

  // Utilities
  generateId: typeof generateId;
  isAccessiblyHidden: typeof isAccessiblyHidden;
  makeInert: typeof makeInert;
  srOnly: typeof srOnly;
}

declare const _default: PulseA11y;
export default _default;
