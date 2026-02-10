/**
 * Pulse Form Management
 * @module pulse-js-framework/runtime/form
 *
 * Reactive form handling with validation, error management,
 * and touched state tracking.
 */

import { pulse, effect, computed, batch, onCleanup } from './pulse.js';

/**
 * @typedef {Object} FieldState
 * @property {any} value - Current field value
 * @property {string|null} error - Validation error message
 * @property {boolean} touched - Whether field has been interacted with
 * @property {boolean} dirty - Whether field value differs from initial
 * @property {boolean} valid - Whether field passes validation
 */

/**
 * @typedef {Object} ValidationRule
 * @property {function(any, Object): boolean|string} validate - Validation function
 * @property {string} [message] - Default error message
 */

/**
 * Check if a validator is async
 * @param {ValidationRule} rule - Validation rule
 * @returns {boolean}
 */
function isAsyncValidator(rule) {
  return rule.async === true;
}

/**
 * Built-in validation rules
 */
export const validators = {
  /**
   * Required field validation
   * @param {string} [message='This field is required']
   */
  required: (message = 'This field is required') => ({
    validate: (value) => {
      if (value === null || value === undefined || value === '') return message;
      if (Array.isArray(value) && value.length === 0) return message;
      return true;
    }
  }),

  /**
   * Minimum length validation
   * @param {number} length - Minimum length
   * @param {string} [message] - Error message
   */
  minLength: (length, message) => ({
    validate: (value) => {
      if (!value) return true; // Let required handle empty
      if (String(value).length < length) {
        return message || `Must be at least ${length} characters`;
      }
      return true;
    }
  }),

  /**
   * Maximum length validation
   * @param {number} length - Maximum length
   * @param {string} [message] - Error message
   */
  maxLength: (length, message) => ({
    validate: (value) => {
      if (!value) return true;
      if (String(value).length > length) {
        return message || `Must be at most ${length} characters`;
      }
      return true;
    }
  }),

  /**
   * Email format validation
   * @param {string} [message='Invalid email address']
   */
  email: (message = 'Invalid email address') => ({
    validate: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || message;
    }
  }),

  /**
   * URL format validation
   * @param {string} [message='Invalid URL']
   */
  url: (message = 'Invalid URL') => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return message;
      }
    }
  }),

  /**
   * Pattern (regex) validation
   * @param {RegExp} pattern - Regex pattern
   * @param {string} [message='Invalid format']
   */
  pattern: (pattern, message = 'Invalid format') => ({
    validate: (value) => {
      if (!value) return true;
      return pattern.test(String(value)) || message;
    }
  }),

  /**
   * Minimum value validation (for numbers)
   * @param {number} min - Minimum value
   * @param {string} [message] - Error message
   */
  min: (min, message) => ({
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = Number(value);
      if (isNaN(num) || num < min) {
        return message || `Must be at least ${min}`;
      }
      return true;
    }
  }),

  /**
   * Maximum value validation (for numbers)
   * @param {number} max - Maximum value
   * @param {string} [message] - Error message
   */
  max: (max, message) => ({
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = Number(value);
      if (isNaN(num) || num > max) {
        return message || `Must be at most ${max}`;
      }
      return true;
    }
  }),

  /**
   * Custom validation function
   * @param {function(any, Object): boolean|string} fn - Validation function
   */
  custom: (fn) => ({
    validate: fn
  }),

  /**
   * Match another field value
   * @param {string} fieldName - Name of field to match
   * @param {string} [message] - Error message
   */
  matches: (fieldName, message) => ({
    validate: (value, allValues) => {
      if (value !== allValues[fieldName]) {
        return message || `Must match ${fieldName}`;
      }
      return true;
    }
  }),

  // ============================================================================
  // Async Validators
  // ============================================================================

  /**
   * Async custom validation function
   * @param {function(any, Object): Promise<boolean|string>} fn - Async validation function
   * @param {Object} [options] - Options
   * @param {number} [options.debounce=300] - Debounce delay in ms
   *
   * @example
   * validators.asyncCustom(async (value) => {
   *   const exists = await checkUsername(value);
   *   return exists ? 'Username already taken' : true;
   * })
   */
  asyncCustom: (fn, options = {}) => ({
    async: true,
    debounce: options.debounce ?? 300,
    validate: fn
  }),

  /**
   * Async email validation (check availability via API)
   * @param {function(string): Promise<boolean>} checkFn - Returns true if email is available
   * @param {string} [message='Email is already taken']
   * @param {Object} [options] - Options
   * @param {number} [options.debounce=300] - Debounce delay in ms
   *
   * @example
   * validators.asyncEmail(
   *   async (email) => {
   *     const res = await fetch(`/api/check-email?email=${email}`);
   *     const { available } = await res.json();
   *     return available;
   *   },
   *   'This email is already registered'
   * )
   */
  asyncEmail: (checkFn, message = 'Email is already taken', options = {}) => ({
    async: true,
    debounce: options.debounce ?? 300,
    validate: async (value, allValues) => {
      if (!value) return true;
      // First check format synchronously
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Invalid email address';
      }
      // Then check availability
      const available = await checkFn(value, allValues);
      return available ? true : message;
    }
  }),

  /**
   * Async unique validation (check uniqueness via API)
   * @param {function(any, Object): Promise<boolean>} checkFn - Returns true if value is unique
   * @param {string} [message='This value is already taken']
   * @param {Object} [options] - Options
   * @param {number} [options.debounce=300] - Debounce delay in ms
   *
   * @example
   * validators.asyncUnique(
   *   async (username) => {
   *     const res = await fetch(`/api/check-username?q=${username}`);
   *     return (await res.json()).available;
   *   },
   *   'Username is already taken'
   * )
   */
  asyncUnique: (checkFn, message = 'This value is already taken', options = {}) => ({
    async: true,
    debounce: options.debounce ?? 300,
    validate: async (value, allValues) => {
      if (!value) return true;
      const unique = await checkFn(value, allValues);
      return unique ? true : message;
    }
  }),

  /**
   * Async server-side validation
   * @param {function(any, Object): Promise<string|null>} validateFn - Returns error message or null
   * @param {Object} [options] - Options
   * @param {number} [options.debounce=300] - Debounce delay in ms
   *
   * @example
   * validators.asyncServer(async (value) => {
   *   const res = await fetch('/api/validate', {
   *     method: 'POST',
   *     body: JSON.stringify({ value })
   *   });
   *   const { error } = await res.json();
   *   return error; // null if valid, error message if invalid
   * })
   */
  asyncServer: (validateFn, options = {}) => ({
    async: true,
    debounce: options.debounce ?? 300,
    validate: async (value, allValues) => {
      const error = await validateFn(value, allValues);
      return error === null ? true : error;
    }
  })
};

/**
 * @typedef {Object} FormOptions
 * @property {boolean} [validateOnChange=true] - Validate on value change
 * @property {boolean} [validateOnBlur=true] - Validate on blur
 * @property {boolean} [validateOnSubmit=true] - Validate on submit
 * @property {function(Object): void} [onSubmit] - Submit handler
 * @property {function(Object): void} [onError] - Error handler
 * @property {'onChange'|'onBlur'|'onSubmit'} [mode='onChange'] - Validation mode
 */

/**
 * Create a reactive form with validation.
 *
 * @template T
 * @param {T} initialValues - Initial form values
 * @param {Object<string, ValidationRule[]>} [validationSchema={}] - Validation rules per field
 * @param {FormOptions} [options={}] - Form configuration
 * @returns {Object} Form state and controls
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
 *
 * // In view
 * el('input', { value: fields.email.value.get(), onInput: fields.email.onChange });
 * el('span.error', fields.email.error.get());
 */
export function useForm(initialValues, validationSchema = {}, options = {}) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
    onSubmit,
    onError,
    mode = 'onChange'
  } = options;

  // Create field states
  const fields = {};
  const fieldNames = Object.keys(initialValues);

  // Version counters for async validation race condition handling
  const validationVersions = {};
  const debounceTimers = {};

  for (const name of fieldNames) {
    const initialValue = initialValues[name];
    const rules = validationSchema[name] || [];

    // Separate sync and async rules
    const syncRules = rules.filter(r => !isAsyncValidator(r));
    const asyncRules = rules.filter(r => isAsyncValidator(r));

    const value = pulse(initialValue);
    const error = pulse(null);
    const touched = pulse(false);
    const validating = pulse(false);
    const dirty = computed(() => value.get() !== initialValue);
    const valid = computed(() => error.get() === null && !validating.get());

    // Initialize version counter
    validationVersions[name] = 0;
    debounceTimers[name] = new Map();

    /**
     * Run sync validators only
     */
    const validateFieldSync = () => {
      const currentValue = value.get();
      const allValues = getValues();

      for (const rule of syncRules) {
        const result = rule.validate(currentValue, allValues);
        if (result !== true) {
          error.set(typeof result === 'string' ? result : rule.message || 'Invalid');
          return false;
        }
      }
      return true;
    };

    /**
     * Run async validators with debouncing
     */
    const validateFieldAsync = async () => {
      if (asyncRules.length === 0) return true;

      const version = ++validationVersions[name];
      validating.set(true);

      try {
        const currentValue = value.get();
        const allValues = getValues();

        for (const rule of asyncRules) {
          // Cancel previous debounce timer for this rule
          const existingTimer = debounceTimers[name].get(rule);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          // Debounce async validation
          await new Promise((resolve) => {
            const timer = setTimeout(resolve, rule.debounce || 300);
            debounceTimers[name].set(rule, timer);
          });

          // Check if this validation is still current
          if (version !== validationVersions[name]) {
            return null; // Cancelled
          }

          const result = await rule.validate(currentValue, allValues);

          // Check again after async operation
          if (version !== validationVersions[name]) {
            return null; // Cancelled
          }

          if (result !== true) {
            error.set(typeof result === 'string' ? result : rule.message || 'Invalid');
            validating.set(false);
            return false;
          }
        }

        // All async validations passed
        if (version === validationVersions[name]) {
          error.set(null);
          validating.set(false);
        }
        return true;
      } catch (err) {
        if (version === validationVersions[name]) {
          error.set(err.message || 'Validation failed');
          validating.set(false);
        }
        return false;
      }
    };

    /**
     * Full validation (sync + async)
     */
    const validateField = async () => {
      // First run sync validators
      if (!validateFieldSync()) {
        validating.set(false);
        return false;
      }

      // Then run async validators
      if (asyncRules.length > 0) {
        const result = await validateFieldAsync();
        if (result === null) return null; // Cancelled
        return result;
      }

      error.set(null);
      return true;
    };

    // Event handlers
    const onChange = (eventOrValue) => {
      const newValue = eventOrValue?.target
        ? (eventOrValue.target.type === 'checkbox'
          ? eventOrValue.target.checked
          : eventOrValue.target.value)
        : eventOrValue;

      value.set(newValue);

      if (validateOnChange && (mode === 'onChange' || touched.get())) {
        // Run sync validation immediately
        validateFieldSync();
        // Trigger async validation (debounced)
        if (asyncRules.length > 0) {
          validateField();
        } else {
          error.set(null);
        }
      }
    };

    const onBlur = () => {
      touched.set(true);
      if (validateOnBlur) {
        validateField();
      }
    };

    const onFocus = () => {
      // Could be used for analytics or UI effects
    };

    fields[name] = {
      value,
      error,
      touched,
      dirty,
      valid,
      validating,
      validate: validateField,
      validateSync: validateFieldSync,
      onChange,
      onBlur,
      onFocus,
      reset: () => {
        validationVersions[name]++; // Cancel pending async validation
        batch(() => {
          value.set(initialValue);
          error.set(null);
          touched.set(false);
          validating.set(false);
        });
      },
      setError: (msg) => error.set(msg),
      clearError: () => error.set(null)
    };
  }

  // Form-level state
  const isSubmitting = pulse(false);
  const submitCount = pulse(0);

  // Computed form state
  const isValid = computed(() => {
    return fieldNames.every(name => fields[name].valid.get());
  });

  const isValidating = computed(() => {
    return fieldNames.some(name => fields[name].validating.get());
  });

  const isDirty = computed(() => {
    return fieldNames.some(name => fields[name].dirty.get());
  });

  const isTouched = computed(() => {
    return fieldNames.some(name => fields[name].touched.get());
  });

  const errors = computed(() => {
    const result = {};
    for (const name of fieldNames) {
      const err = fields[name].error.get();
      if (err) result[name] = err;
    }
    return result;
  });

  /**
   * Get current form values
   */
  function getValues() {
    const values = {};
    for (const name of fieldNames) {
      values[name] = fields[name].value.get();
    }
    return values;
  }

  /**
   * Set multiple values at once
   */
  function setValues(newValues, shouldValidate = false) {
    batch(() => {
      for (const [name, value] of Object.entries(newValues)) {
        if (fields[name]) {
          fields[name].value.set(value);
        }
      }
    });

    if (shouldValidate) {
      validateAll();
    }
  }

  /**
   * Set a single field value
   */
  function setValue(name, value, shouldValidate = false) {
    if (fields[name]) {
      fields[name].value.set(value);
      if (shouldValidate) {
        fields[name].validate();
      }
    }
  }

  /**
   * Validate all fields (sync only, for immediate check)
   */
  function validateAllSync() {
    let allValid = true;
    for (const name of fieldNames) {
      if (!fields[name].validateSync()) {
        allValid = false;
      }
    }
    return allValid;
  }

  /**
   * Validate all fields (sync + async)
   * @returns {Promise<boolean>}
   */
  async function validateAll() {
    // First run all sync validations
    let allValid = validateAllSync();

    // Then run async validations in parallel
    const asyncResults = await Promise.all(
      fieldNames.map(name => fields[name].validate())
    );

    // Check results (null means cancelled, which we treat as valid for now)
    for (const result of asyncResults) {
      if (result === false) {
        allValid = false;
      }
    }

    return allValid;
  }

  /**
   * Reset form to initial values
   */
  function reset(newValues) {
    batch(() => {
      for (const name of fieldNames) {
        const resetValue = newValues?.[name] ?? initialValues[name];
        fields[name].value.set(resetValue);
        fields[name].error.set(null);
        fields[name].touched.set(false);
      }
      isSubmitting.set(false);
    });
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(event) {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    submitCount.update(c => c + 1);

    // Mark all fields as touched
    batch(() => {
      for (const name of fieldNames) {
        fields[name].touched.set(true);
      }
    });

    // Validate if required
    if (validateOnSubmit) {
      const valid = await validateAll();
      if (!valid) {
        if (onError) {
          onError(errors.get());
        }
        return false;
      }
    }

    isSubmitting.set(true);

    try {
      if (onSubmit) {
        await onSubmit(getValues());
      }
      return true;
    } catch (err) {
      if (onError) {
        onError({ _form: err.message || 'Submit failed' });
      }
      return false;
    } finally {
      isSubmitting.set(false);
    }
  }

  /**
   * Set form-level or field errors
   */
  function setErrors(errorMap) {
    batch(() => {
      for (const [name, message] of Object.entries(errorMap)) {
        if (fields[name]) {
          fields[name].error.set(message);
        }
      }
    });
  }

  /**
   * Clear all errors
   */
  function clearErrors() {
    batch(() => {
      for (const name of fieldNames) {
        fields[name].error.set(null);
      }
    });
  }

  const dispose = () => {
    for (const name of fieldNames) {
      const timers = debounceTimers[name];
      if (timers) {
        for (const timerId of timers.values()) {
          clearTimeout(timerId);
        }
        timers.clear();
      }
    }
  };
  onCleanup(dispose);

  return {
    fields,
    isValid,
    isValidating,
    isDirty,
    isTouched,
    isSubmitting,
    submitCount,
    errors,
    getValues,
    setValues,
    setValue,
    validateAll,
    validateAllSync,
    reset,
    handleSubmit,
    setErrors,
    clearErrors,
    dispose
  };
}

/**
 * Create a single reactive field (for use outside of useForm)
 *
 * @param {any} initialValue - Initial field value
 * @param {ValidationRule[]} [rules=[]] - Validation rules
 * @param {Object} [options={}] - Field options
 * @param {boolean} [options.validateOnChange=true] - Validate on change (after touched)
 * @param {boolean} [options.validateOnBlur=true] - Validate on blur
 * @returns {Object} Field state and controls
 *
 * @example
 * const email = useField('', [validators.required(), validators.email()]);
 *
 * // With async validation
 * const username = useField('', [
 *   validators.required(),
 *   validators.asyncUnique(async (value) => checkUsernameAvailable(value))
 * ]);
 *
 * // Bind to input
 * el('input', { value: email.value.get(), onInput: email.onChange, onBlur: email.onBlur });
 */
export function useField(initialValue, rules = [], options = {}) {
  const { validateOnChange = true, validateOnBlur = true } = options;

  const value = pulse(initialValue);
  const error = pulse(null);
  const touched = pulse(false);
  const validating = pulse(false);
  const dirty = computed(() => value.get() !== initialValue);
  const valid = computed(() => error.get() === null && !validating.get());

  // Separate sync and async rules
  const syncRules = rules.filter(r => !isAsyncValidator(r));
  const asyncRules = rules.filter(r => isAsyncValidator(r));

  // Version counter for race condition handling
  let validationVersion = 0;

  // Debounce timers per async rule
  const debounceTimers = new Map();

  /**
   * Run synchronous validators
   */
  const validateSync = (currentValue, allValues = {}) => {
    for (const rule of syncRules) {
      const result = rule.validate(currentValue, allValues);
      if (result !== true) {
        error.set(typeof result === 'string' ? result : rule.message || 'Invalid');
        return false;
      }
    }
    return true;
  };

  /**
   * Run async validators with debouncing and race condition handling
   */
  const validateAsync = async (currentValue, allValues = {}) => {
    if (asyncRules.length === 0) return true;

    const version = ++validationVersion;
    validating.set(true);

    try {
      for (const rule of asyncRules) {
        // Cancel previous debounce timer for this rule
        const existingTimer = debounceTimers.get(rule);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Debounce async validation
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, rule.debounce || 300);
          debounceTimers.set(rule, timer);
        });

        // Check if this validation is still current
        if (version !== validationVersion) {
          return null; // Cancelled
        }

        const result = await rule.validate(currentValue, allValues);

        // Check again after async operation
        if (version !== validationVersion) {
          return null; // Cancelled
        }

        if (result !== true) {
          error.set(typeof result === 'string' ? result : rule.message || 'Invalid');
          validating.set(false);
          return false;
        }
      }

      // All async validations passed
      if (version === validationVersion) {
        error.set(null);
        validating.set(false);
      }
      return true;
    } catch (err) {
      if (version === validationVersion) {
        error.set(err.message || 'Validation failed');
        validating.set(false);
      }
      return false;
    }
  };

  /**
   * Full validation (sync + async)
   */
  const validate = async (allValues = {}) => {
    const currentValue = value.get();

    // First run sync validators
    if (!validateSync(currentValue, allValues)) {
      validating.set(false);
      return false;
    }

    // Then run async validators
    if (asyncRules.length > 0) {
      const result = await validateAsync(currentValue, allValues);
      if (result === null) return null; // Cancelled
      return result;
    }

    error.set(null);
    return true;
  };

  /**
   * Sync-only validation (for immediate feedback)
   */
  const validateSyncOnly = (allValues = {}) => {
    const currentValue = value.get();
    if (!validateSync(currentValue, allValues)) {
      return false;
    }
    if (syncRules.length > 0 && asyncRules.length === 0) {
      error.set(null);
    }
    return true;
  };

  const onChange = (eventOrValue) => {
    const newValue = eventOrValue?.target
      ? (eventOrValue.target.type === 'checkbox'
        ? eventOrValue.target.checked
        : eventOrValue.target.value)
      : eventOrValue;

    value.set(newValue);

    if (validateOnChange && touched.get()) {
      // Run sync validation immediately
      validateSyncOnly();
      // Trigger async validation (debounced)
      if (asyncRules.length > 0) {
        validate();
      }
    }
  };

  const onBlur = () => {
    touched.set(true);
    if (validateOnBlur) {
      validate();
    }
  };

  const reset = () => {
    validationVersion++; // Cancel any pending async validation
    batch(() => {
      value.set(initialValue);
      error.set(null);
      touched.set(false);
      validating.set(false);
    });
  };

  const dispose = () => {
    for (const timerId of debounceTimers.values()) {
      clearTimeout(timerId);
    }
    debounceTimers.clear();
  };
  onCleanup(dispose);

  return {
    value,
    error,
    touched,
    dirty,
    valid,
    validating,
    validate,
    validateSync: validateSyncOnly,
    onChange,
    onBlur,
    reset,
    setError: (msg) => error.set(msg),
    clearError: () => error.set(null),
    dispose
  };
}

/**
 * Create a field array for dynamic lists of fields
 *
 * @template T
 * @param {T[]} initialValues - Initial array of values
 * @param {ValidationRule[]} [itemRules=[]] - Validation rules for each item
 * @returns {Object} Field array state and controls
 *
 * @example
 * const tags = useFieldArray(['tag1', 'tag2'], [validators.required()]);
 *
 * // Add new tag
 * tags.append('tag3');
 *
 * // Remove tag
 * tags.remove(0);
 *
 * // Render items
 * tags.fields.get().forEach((field, index) => {
 *   el('input', { value: field.value.get(), onInput: field.onChange });
 *   el('button', { onClick: () => tags.remove(index) }, 'Remove');
 * });
 */
export function useFieldArray(initialValues = [], itemRules = []) {
  // Create field for each initial value
  const createField = (value) => useField(value, itemRules);

  const fieldsArray = pulse(initialValues.map(createField));

  // Computed values
  const values = computed(() => fieldsArray.get().map(f => f.value.get()));
  const errors = computed(() => fieldsArray.get().map(f => f.error.get()));
  const isValid = computed(() => fieldsArray.get().every(f => f.valid.get()));

  const append = (value) => {
    fieldsArray.update(arr => [...arr, createField(value)]);
  };

  const prepend = (value) => {
    fieldsArray.update(arr => [createField(value), ...arr]);
  };

  const insert = (index, value) => {
    fieldsArray.update(arr => {
      const newArr = [...arr];
      newArr.splice(index, 0, createField(value));
      return newArr;
    });
  };

  const remove = (index) => {
    fieldsArray.update(arr => arr.filter((_, i) => i !== index));
  };

  const move = (from, to) => {
    fieldsArray.update(arr => {
      const newArr = [...arr];
      const [item] = newArr.splice(from, 1);
      newArr.splice(to, 0, item);
      return newArr;
    });
  };

  const swap = (indexA, indexB) => {
    fieldsArray.update(arr => {
      const newArr = [...arr];
      [newArr[indexA], newArr[indexB]] = [newArr[indexB], newArr[indexA]];
      return newArr;
    });
  };

  const replace = (index, value) => {
    fieldsArray.update(arr => {
      const newArr = [...arr];
      newArr[index] = createField(value);
      return newArr;
    });
  };

  const reset = (newValues = initialValues) => {
    fieldsArray.set(newValues.map(createField));
  };

  /**
   * Validate all fields synchronously only
   */
  const validateAllSync = () => {
    const results = fieldsArray.get().map(f => f.validateSync());
    return results.every(r => r);
  };

  /**
   * Validate all fields (sync + async)
   */
  const validateAll = async () => {
    // First run sync validation on all
    const syncResults = validateAllSync();

    // Then run async validation on all
    const asyncResults = await Promise.all(
      fieldsArray.get().map(f => f.validate())
    );

    return asyncResults.every(r => r === true);
  };

  const dispose = () => {
    for (const field of fieldsArray.get()) {
      field.dispose?.();
    }
  };
  onCleanup(dispose);

  return {
    fields: fieldsArray,
    values,
    errors,
    isValid,
    append,
    prepend,
    insert,
    remove,
    move,
    swap,
    replace,
    reset,
    validateAll,
    validateAllSync,
    dispose
  };
}

export default {
  useForm,
  useField,
  useFieldArray,
  validators
};
