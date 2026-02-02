/**
 * Pulse Framework - Form Management Type Definitions
 * @module pulse-js-framework/runtime/form
 */

import { Pulse } from './pulse';

// ============================================================================
// Validation Rules
// ============================================================================

/** Sync validation result - true for valid, string for error message */
export type ValidationResult = true | string;

/** Async validation result */
export type AsyncValidationResult = Promise<ValidationResult>;

/** Base validation rule */
export interface ValidationRule {
  /** Validation function */
  validate: (value: unknown, allValues: Record<string, unknown>) => ValidationResult;

  /** Default error message */
  message?: string;
}

/** Async validation rule */
export interface AsyncValidationRule {
  /** Mark as async validator */
  async: true;

  /** Debounce delay in ms */
  debounce?: number;

  /** Async validation function */
  validate: (value: unknown, allValues: Record<string, unknown>) => AsyncValidationResult;

  /** Default error message */
  message?: string;
}

/** Any validation rule (sync or async) */
export type AnyValidationRule = ValidationRule | AsyncValidationRule;

/** Async validator options */
export interface AsyncValidatorOptions {
  /** Debounce delay in ms (default: 300) */
  debounce?: number;
}

/** Built-in validators */
export interface Validators {
  /** Required field validation */
  required(message?: string): ValidationRule;

  /** Minimum length validation */
  minLength(length: number, message?: string): ValidationRule;

  /** Maximum length validation */
  maxLength(length: number, message?: string): ValidationRule;

  /** Email format validation */
  email(message?: string): ValidationRule;

  /** URL format validation */
  url(message?: string): ValidationRule;

  /** Regex pattern validation */
  pattern(pattern: RegExp, message?: string): ValidationRule;

  /** Minimum value validation (for numbers) */
  min(value: number, message?: string): ValidationRule;

  /** Maximum value validation (for numbers) */
  max(value: number, message?: string): ValidationRule;

  /** Custom validation function */
  custom(
    fn: (value: unknown, allValues: Record<string, unknown>) => ValidationResult
  ): ValidationRule;

  /** Match another field value */
  matches(fieldName: string, message?: string): ValidationRule;

  /** Async custom validation */
  asyncCustom(
    fn: (value: unknown, allValues: Record<string, unknown>) => AsyncValidationResult,
    options?: AsyncValidatorOptions
  ): AsyncValidationRule;

  /** Async email validation (check availability via API) */
  asyncEmail(
    checkFn: (email: string, allValues: Record<string, unknown>) => Promise<boolean>,
    message?: string,
    options?: AsyncValidatorOptions
  ): AsyncValidationRule;

  /** Async unique validation (check uniqueness via API) */
  asyncUnique(
    checkFn: (value: unknown, allValues: Record<string, unknown>) => Promise<boolean>,
    message?: string,
    options?: AsyncValidatorOptions
  ): AsyncValidationRule;

  /** Async server-side validation */
  asyncServer(
    validateFn: (value: unknown, allValues: Record<string, unknown>) => Promise<string | null>,
    options?: AsyncValidatorOptions
  ): AsyncValidationRule;
}

/** Exported validators object */
export declare const validators: Validators;

// ============================================================================
// Field Types
// ============================================================================

/** Field state and controls */
export interface Field<T = unknown> {
  /** Reactive field value */
  value: Pulse<T>;

  /** Reactive error message (null if valid) */
  error: Pulse<string | null>;

  /** Reactive touched state (true after blur) */
  touched: Pulse<boolean>;

  /** Reactive dirty state (true if value changed from initial) */
  dirty: Pulse<boolean>;

  /** Reactive valid state (no error and not validating) */
  valid: Pulse<boolean>;

  /** Reactive validating state (true during async validation) */
  validating: Pulse<boolean>;

  /** Validate field (sync + async) */
  validate(): Promise<boolean | null>;

  /** Validate field (sync only) */
  validateSync(): boolean;

  /** Handle input change (works with events or raw values) */
  onChange(eventOrValue: Event | T): void;

  /** Handle blur event */
  onBlur(): void;

  /** Handle focus event */
  onFocus?(): void;

  /** Reset field to initial value */
  reset(): void;

  /** Set error message manually */
  setError(message: string): void;

  /** Clear error message */
  clearError(): void;
}

// ============================================================================
// useForm
// ============================================================================

/** Validation schema - maps field names to validation rules */
export type ValidationSchema<T> = {
  [K in keyof T]?: AnyValidationRule[];
};

/** Form options */
export interface FormOptions<T> {
  /** Validate on value change (default: true) */
  validateOnChange?: boolean;

  /** Validate on blur (default: true) */
  validateOnBlur?: boolean;

  /** Validate on submit (default: true) */
  validateOnSubmit?: boolean;

  /** Submit handler */
  onSubmit?: (values: T) => void | Promise<void>;

  /** Error handler */
  onError?: (errors: Record<string, string>) => void;

  /** Validation mode: when to start validating (default: 'onChange') */
  mode?: 'onChange' | 'onBlur' | 'onSubmit';
}

/** Form fields - maps field names to Field objects */
export type FormFields<T> = {
  [K in keyof T]: Field<T[K]>;
};

/** Form errors - maps field names to error messages */
export type FormErrors<T> = {
  [K in keyof T]?: string;
};

/** Return type of useForm */
export interface UseFormReturn<T extends Record<string, unknown>> {
  /** Field states and controls */
  fields: FormFields<T>;

  /** Reactive overall validity state */
  isValid: Pulse<boolean>;

  /** Reactive validating state (any field is validating) */
  isValidating: Pulse<boolean>;

  /** Reactive dirty state (any field is dirty) */
  isDirty: Pulse<boolean>;

  /** Reactive touched state (any field is touched) */
  isTouched: Pulse<boolean>;

  /** Reactive submitting state */
  isSubmitting: Pulse<boolean>;

  /** Number of submit attempts */
  submitCount: Pulse<number>;

  /** Reactive errors object */
  errors: Pulse<FormErrors<T>>;

  /** Get current form values */
  getValues(): T;

  /** Set multiple values at once */
  setValues(values: Partial<T>, shouldValidate?: boolean): void;

  /** Set a single field value */
  setValue<K extends keyof T>(name: K, value: T[K], shouldValidate?: boolean): void;

  /** Validate all fields (sync + async) */
  validateAll(): Promise<boolean>;

  /** Validate all fields (sync only) */
  validateAllSync(): boolean;

  /** Reset form to initial values */
  reset(newValues?: Partial<T>): void;

  /** Handle form submission */
  handleSubmit(event?: Event): Promise<boolean>;

  /** Set field errors manually */
  setErrors(errors: FormErrors<T>): void;

  /** Clear all errors */
  clearErrors(): void;
}

/**
 * Create a reactive form with validation.
 *
 * @example
 * const { fields, handleSubmit, isValid, reset } = useForm(
 *   { email: '', password: '' },
 *   {
 *     email: [validators.required(), validators.email()],
 *     password: [validators.required(), validators.minLength(8)]
 *   },
 *   {
 *     onSubmit: (values) => console.log('Submit:', values)
 *   }
 * );
 */
export declare function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  validationSchema?: ValidationSchema<T>,
  options?: FormOptions<T>
): UseFormReturn<T>;

// ============================================================================
// useField
// ============================================================================

/** Options for useField */
export interface UseFieldOptions {
  /** Validate on change after touched (default: true) */
  validateOnChange?: boolean;

  /** Validate on blur (default: true) */
  validateOnBlur?: boolean;
}

/**
 * Create a single reactive field (for use outside of useForm).
 *
 * @example
 * const email = useField('', [validators.required(), validators.email()]);
 *
 * // With async validation
 * const username = useField('', [
 *   validators.required(),
 *   validators.asyncUnique(async (value) => checkUsernameAvailable(value))
 * ]);
 */
export declare function useField<T = unknown>(
  initialValue: T,
  rules?: AnyValidationRule[],
  options?: UseFieldOptions
): Field<T>;

// ============================================================================
// useFieldArray
// ============================================================================

/** Field in a field array */
export interface FieldArrayItem<T> extends Field<T> {}

/** Return type of useFieldArray */
export interface UseFieldArrayReturn<T> {
  /** Reactive array of fields */
  fields: Pulse<FieldArrayItem<T>[]>;

  /** Reactive array of current values */
  values: Pulse<T[]>;

  /** Reactive array of errors */
  errors: Pulse<(string | null)[]>;

  /** Reactive overall validity */
  isValid: Pulse<boolean>;

  /** Append a new field at the end */
  append(value: T): void;

  /** Prepend a new field at the beginning */
  prepend(value: T): void;

  /** Insert a new field at specific index */
  insert(index: number, value: T): void;

  /** Remove field at index */
  remove(index: number): void;

  /** Move field from one index to another */
  move(from: number, to: number): void;

  /** Swap two fields */
  swap(indexA: number, indexB: number): void;

  /** Replace field at index with new value */
  replace(index: number, value: T): void;

  /** Reset to initial values */
  reset(newValues?: T[]): void;

  /** Validate all fields (sync + async) */
  validateAll(): Promise<boolean>;

  /** Validate all fields (sync only) */
  validateAllSync(): boolean;
}

/**
 * Create a field array for dynamic lists of fields.
 *
 * @example
 * const tags = useFieldArray(['tag1', 'tag2'], [validators.required()]);
 *
 * tags.append('tag3');
 * tags.remove(0);
 *
 * tags.fields.get().forEach((field, index) => {
 *   el('input', { value: field.value.get(), onInput: field.onChange });
 * });
 */
export declare function useFieldArray<T>(
  initialValues?: T[],
  itemRules?: AnyValidationRule[]
): UseFieldArrayReturn<T>;
