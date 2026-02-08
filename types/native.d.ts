/**
 * Pulse Framework - Native Mobile Bridge Type Definitions
 * @module pulse-js-framework/runtime/native
 */

import { Pulse } from './pulse';

// ============================================================================
// Types
// ============================================================================

/** Supported platform identifiers */
export type Platform = 'ios' | 'android' | 'web';

/** Network connectivity status */
export interface NetworkStatus {
  connected: boolean;
  type: string;
}

/** Device information data */
export interface DeviceInfoData {
  platform: string;
  userAgent: string;
  language: string;
  [key: string]: unknown;
}

// ============================================================================
// Interfaces
// ============================================================================

/** Reactive native storage with automatic persistence */
export interface NativeStorage {
  /**
   * Get a reactive value from native storage.
   * Returns a Pulse signal that auto-persists changes.
   *
   * @param key - Storage key
   * @param defaultValue - Default value if key not found
   * @returns A Pulse that syncs with native storage
   *
   * @example
   * const storage = createNativeStorage('app_');
   * const theme = storage.get('theme', 'light');
   * theme.set('dark'); // Auto-saves to storage
   */
  get<T = unknown>(key: string, defaultValue?: T): Pulse<T>;

  /**
   * Remove a value from storage
   *
   * @param key - Storage key to remove
   */
  remove(key: string): Promise<void>;

  /**
   * Clear all storage entries with the configured prefix
   */
  clear(): Promise<void>;
}

/** Reactive device information */
export interface DeviceInfo {
  /** Device info as a reactive Pulse */
  info: Pulse<DeviceInfoData | null>;

  /** Network status as a reactive Pulse */
  network: Pulse<NetworkStatus>;

  /** Current platform */
  readonly platform: Platform;

  /** Whether running in a native app */
  readonly isNative: boolean;

  /** Whether the device is currently online */
  readonly isOnline: boolean;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Check if PulseMobile bridge is available and valid.
 *
 * Security: This function validates the bridge structure, version,
 * and API surface before returning true. Malicious or malformed
 * bridges will be rejected.
 *
 * @returns True if a valid PulseMobile bridge is available
 */
export declare function isNativeAvailable(): boolean;

/**
 * Get the PulseMobile instance (validated).
 *
 * @throws {Error} If bridge is not available or validation failed
 * @returns The validated PulseMobile bridge object
 */
export declare function getNative(): object;

/**
 * Get current platform.
 *
 * @returns 'ios', 'android', or 'web'
 */
export declare function getPlatform(): Platform;

/**
 * Check if running in a native environment.
 *
 * @returns True if running inside a Pulse native mobile app
 */
export declare function isNative(): boolean;

/**
 * Create reactive native storage.
 * Syncs between native storage and Pulse reactivity system.
 * Falls back to localStorage on web.
 *
 * @param prefix - Key prefix for all storage operations (default: '')
 * @returns A NativeStorage instance with reactive get, remove, and clear methods
 *
 * @example
 * const storage = createNativeStorage('app_');
 * const theme = storage.get('theme', 'light');
 * theme.set('dark'); // Auto-persists to storage
 * await storage.remove('theme');
 * await storage.clear();
 */
export declare function createNativeStorage(prefix?: string): NativeStorage;

/**
 * Create reactive device info.
 * Provides platform, network status, and device details as reactive Pulses.
 *
 * @returns A DeviceInfo object with reactive properties
 *
 * @example
 * const device = createDeviceInfo();
 * device.info.get();      // { platform, userAgent, language, ... }
 * device.network.get();   // { connected: true, type: 'wifi' }
 * device.isOnline;        // true/false
 * device.platform;        // 'ios' | 'android' | 'web'
 */
export declare function createDeviceInfo(): DeviceInfo;

/**
 * Register a callback for when the app is paused/backgrounded.
 * On web, this listens for visibilitychange events.
 *
 * @param callback - Function to call when app is paused
 */
export declare function onAppPause(callback: () => void): void;

/**
 * Register a callback for when the app is resumed/foregrounded.
 * On web, this listens for visibilitychange events.
 *
 * @param callback - Function to call when app is resumed
 */
export declare function onAppResume(callback: () => void): void;

/**
 * Register a callback for the Android back button.
 * Only works in native Android environments.
 *
 * @param callback - Function to call when back button is pressed
 */
export declare function onBackButton(callback: () => void): void;

/**
 * Register a callback for when the native bridge is ready.
 * If the bridge is already ready, the callback is called asynchronously.
 *
 * @param callback - Function to call with platform details
 *
 * @example
 * onNativeReady(({ platform }) => {
 *   console.log('Native ready on', platform);
 * });
 */
export declare function onNativeReady(callback: (detail: { platform: Platform }) => void): void;

/**
 * Exit the app (Android only).
 * Logs a warning on non-Android platforms.
 *
 * @returns Promise that resolves when the app exits
 */
export declare function exitApp(): Promise<void>;

/**
 * Minimize the app.
 * Only works in native environments.
 *
 * @returns Promise that resolves when the app is minimized
 */
export declare function minimizeApp(): Promise<void>;

/**
 * Clear the bridge validation cache.
 * Useful for testing or after bridge changes.
 */
export declare function clearBridgeValidationCache(): void;

/**
 * Get the last bridge validation error (if any).
 *
 * @returns The validation error message, or null if validation passed
 */
export declare function getBridgeValidationError(): string | null;

// ============================================================================
// Constants
// ============================================================================

/** Native UI helpers (toast, vibration) */
export declare const NativeUI: {
  /**
   * Show a toast message.
   * Falls back to console logging on web.
   *
   * @param message - Toast message text
   * @param isLong - Whether to show a long-duration toast (default: false)
   */
  toast(message: string, isLong?: boolean): Promise<void>;

  /**
   * Trigger haptic feedback / vibration.
   * Falls back to navigator.vibrate on web.
   *
   * @param duration - Vibration duration in ms (default: 100)
   */
  vibrate(duration?: number): Promise<void>;
};

/** Native clipboard helpers */
export declare const NativeClipboard: {
  /**
   * Copy text to clipboard.
   * Falls back to navigator.clipboard on web.
   *
   * @param text - Text to copy
   */
  copy(text: string): Promise<void>;

  /**
   * Read text from clipboard.
   * Falls back to navigator.clipboard on web.
   *
   * @returns The clipboard text content
   */
  read(): Promise<string>;
};

// ============================================================================
// Default Export
// ============================================================================

declare const native: {
  isNativeAvailable: typeof isNativeAvailable;
  getNative: typeof getNative;
  getPlatform: typeof getPlatform;
  isNative: typeof isNative;
  createNativeStorage: typeof createNativeStorage;
  createDeviceInfo: typeof createDeviceInfo;
  NativeUI: typeof NativeUI;
  NativeClipboard: typeof NativeClipboard;
  onAppPause: typeof onAppPause;
  onAppResume: typeof onAppResume;
  onBackButton: typeof onBackButton;
  onNativeReady: typeof onNativeReady;
  exitApp: typeof exitApp;
  minimizeApp: typeof minimizeApp;
  clearBridgeValidationCache: typeof clearBridgeValidationCache;
  getBridgeValidationError: typeof getBridgeValidationError;
};

export default native;
