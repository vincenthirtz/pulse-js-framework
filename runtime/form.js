/**
 * Pulse Form Management
 * @module pulse-js-framework/runtime/form
 *
 * Reactive form handling with validation, error management,
 * and touched state tracking.
 */

import { pulse, effect, computed, batch } from './pulse.js';

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

  for (const name of fieldNames) {
    const initialValue = initialValues[name];
    const rules = validationSchema[name] || [];

    const value = pulse(initialValue);
    const error = pulse(null);
    const touched = pulse(false);
    const dirty = computed(() => value.get() !== initialValue);
    const valid = computed(() => error.get() === null);

    // Validate a single field
    const validateField = () => {
      const currentValue = value.get();
      const allValues = getValues();

      for (const rule of rules) {
        const result = rule.validate(currentValue, allValues);
        if (result !== true) {
          error.set(typeof result === 'string' ? result : rule.message || 'Invalid');
          return false;
        }
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
        validateField();
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
      validate: validateField,
      onChange,
      onBlur,
      onFocus,
      reset: () => {
        batch(() => {
          value.set(initialValue);
          error.set(null);
          touched.set(false);
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
   * Validate all fields
   */
  function validateAll() {
    let allValid = true;
    for (const name of fieldNames) {
      if (!fields[name].validate()) {
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
      const valid = validateAll();
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

  return {
    fields,
    isValid,
    isDirty,
    isTouched,
    isSubmitting,
    submitCount,
    errors,
    getValues,
    setValues,
    setValue,
    validateAll,
    reset,
    handleSubmit,
    setErrors,
    clearErrors
  };
}

/**
 * Create a single reactive field (for use outside of useForm)
 *
 * @param {any} initialValue - Initial field value
 * @param {ValidationRule[]} [rules=[]] - Validation rules
 * @returns {Object} Field state and controls
 *
 * @example
 * const email = useField('', [validators.required(), validators.email()]);
 *
 * // Bind to input
 * el('input', { value: email.value.get(), onInput: email.onChange, onBlur: email.onBlur });
 */
export function useField(initialValue, rules = []) {
  const value = pulse(initialValue);
  const error = pulse(null);
  const touched = pulse(false);
  const dirty = computed(() => value.get() !== initialValue);
  const valid = computed(() => error.get() === null);

  const validate = () => {
    const currentValue = value.get();

    for (const rule of rules) {
      const result = rule.validate(currentValue, {});
      if (result !== true) {
        error.set(typeof result === 'string' ? result : rule.message || 'Invalid');
        return false;
      }
    }
    error.set(null);
    return true;
  };

  const onChange = (eventOrValue) => {
    const newValue = eventOrValue?.target
      ? (eventOrValue.target.type === 'checkbox'
        ? eventOrValue.target.checked
        : eventOrValue.target.value)
      : eventOrValue;

    value.set(newValue);

    if (touched.get()) {
      validate();
    }
  };

  const onBlur = () => {
    touched.set(true);
    validate();
  };

  const reset = () => {
    batch(() => {
      value.set(initialValue);
      error.set(null);
      touched.set(false);
    });
  };

  return {
    value,
    error,
    touched,
    dirty,
    valid,
    validate,
    onChange,
    onBlur,
    reset,
    setError: (msg) => error.set(msg),
    clearError: () => error.set(null)
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

  const validateAll = () => {
    // Use map instead of every to validate ALL fields (every short-circuits)
    const results = fieldsArray.get().map(f => f.validate());
    return results.every(r => r);
  };

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
    validateAll
  };
}

export default {
  useForm,
  useField,
  useFieldArray,
  validators
};
