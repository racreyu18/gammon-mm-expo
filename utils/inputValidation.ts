/**
 * Comprehensive input validation and sanitization utilities
 * Provides security and data integrity for user inputs
 */

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  barcode: /^[A-Z0-9\-]+$/i,
  materialCode: /^[A-Z0-9\-_]+$/i,
  quantity: /^\d+(\.\d{1,2})?$/,
  positiveNumber: /^\d*\.?\d+$/,
  safeString: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
} as const;

// Input sanitization functions
export class InputSanitizer {
  /**
   * Remove potentially dangerous characters and scripts
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>'"&]/g, (char) => {
        // Escape dangerous characters
        const escapeMap: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;',
        };
        return escapeMap[char] || char;
      });
  }

  /**
   * Sanitize and validate barcode input
   */
  static sanitizeBarcode(input: string): string {
    return InputSanitizer.sanitizeString(input)
      .toUpperCase()
      .replace(/[^A-Z0-9\-]/g, '');
  }

  /**
   * Sanitize material code
   */
  static sanitizeMaterialCode(input: string): string {
    return InputSanitizer.sanitizeString(input)
      .toUpperCase()
      .replace(/[^A-Z0-9\-_]/g, '');
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: string | number): number | null {
    if (typeof input === 'number') return isNaN(input) ? null : input;
    
    const cleaned = String(input).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Sanitize quantity input (positive numbers with up to 2 decimal places)
   */
  static sanitizeQuantity(input: string | number): number | null {
    const num = this.sanitizeNumber(input);
    if (num === null || num < 0) return null;
    return Math.round(num * 100) / 100; // Round to 2 decimal places
  }
}

// Validation functions
export class InputValidator {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    return ValidationPatterns.email.test(email.trim());
  }

  /**
   * Validate barcode format
   */
  static isValidBarcode(barcode: string): boolean {
    const sanitized = InputSanitizer.sanitizeBarcode(barcode);
    return sanitized.length >= 3 && ValidationPatterns.barcode.test(sanitized);
  }

  /**
   * Validate material code
   */
  static isValidMaterialCode(code: string): boolean {
    const sanitized = InputSanitizer.sanitizeMaterialCode(code);
    return sanitized.length >= 2 && ValidationPatterns.materialCode.test(sanitized);
  }

  /**
   * Validate quantity
   */
  static isValidQuantity(quantity: string | number): boolean {
    const sanitized = InputSanitizer.sanitizeQuantity(quantity);
    return sanitized !== null && sanitized > 0;
  }

  /**
   * Validate string length
   */
  static isValidLength(input: string, min: number = 1, max: number = 255): boolean {
    const sanitized = InputSanitizer.sanitizeString(input);
    return sanitized.length >= min && sanitized.length <= max;
  }

  /**
   * Validate safe string (no dangerous characters)
   */
  static isSafeString(input: string): boolean {
    return ValidationPatterns.safeString.test(input);
  }

  /**
   * Validate positive number
   */
  static isPositiveNumber(input: string | number): boolean {
    const num = InputSanitizer.sanitizeNumber(input);
    return num !== null && num > 0;
  }
}

// Form validation schemas
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  sanitizer?: (value: any) => any;
}

export interface ValidationSchema {
  [field: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, any>;
}

export class FormValidator {
  /**
   * Validate form data against schema
   */
  static validate(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
    const errors: Record<string, string> = {};
    const sanitizedData: Record<string, any> = {};

    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field];
      
      // Apply sanitizer if provided
      const sanitizedValue = rule.sanitizer ? rule.sanitizer(value) : value;
      sanitizedData[field] = sanitizedValue;

      // Required validation
      if (rule.required && (!sanitizedValue || sanitizedValue === '')) {
        errors[field] = `${field} is required`;
        continue;
      }

      // Skip other validations if field is empty and not required
      if (!sanitizedValue && !rule.required) continue;

      // Length validation
      if (rule.minLength && String(sanitizedValue).length < rule.minLength) {
        errors[field] = `${field} must be at least ${rule.minLength} characters`;
        continue;
      }

      if (rule.maxLength && String(sanitizedValue).length > rule.maxLength) {
        errors[field] = `${field} must not exceed ${rule.maxLength} characters`;
        continue;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(String(sanitizedValue))) {
        errors[field] = `${field} format is invalid`;
        continue;
      }

      // Custom validation
      if (rule.custom && !rule.custom(sanitizedValue)) {
        errors[field] = `${field} is invalid`;
        continue;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData,
    };
  }
}

// Common validation schemas
export const CommonSchemas = {
  barcodeScan: {
    barcode: {
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: ValidationPatterns.barcode,
      sanitizer: InputSanitizer.sanitizeBarcode,
    },
  },
  
  materialMovement: {
    materialCode: {
      required: true,
      minLength: 2,
      maxLength: 20,
      pattern: ValidationPatterns.materialCode,
      sanitizer: InputSanitizer.sanitizeMaterialCode,
    },
    quantity: {
      required: true,
      custom: InputValidator.isValidQuantity,
      sanitizer: InputSanitizer.sanitizeQuantity,
    },
    location: {
      required: true,
      minLength: 2,
      maxLength: 50,
      sanitizer: InputSanitizer.sanitizeString,
    },
    notes: {
      required: false,
      maxLength: 500,
      sanitizer: InputSanitizer.sanitizeString,
    },
  },

  userProfile: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: ValidationPatterns.alphanumericWithSpaces,
      sanitizer: InputSanitizer.sanitizeString,
    },
    email: {
      required: true,
      custom: InputValidator.isValidEmail,
      sanitizer: InputSanitizer.sanitizeString,
    },
  },
} as const;

// Export utility functions for easy access
export const validateAndSanitize = FormValidator.validate;
export const sanitize = InputSanitizer.sanitizeString;
export const validate = InputValidator;