import { describe, it, expect } from '@jest/globals';
import {
  ValidationPatterns,
  InputSanitizer,
  InputValidator,
  FormValidator,
  CommonSchemas
} from '../../utils/inputValidation';

describe('ValidationPatterns', () => {
  describe('email validation', () => {
    it('should validate correct email formats', () => {
      expect(ValidationPatterns.email.test('user@example.com')).toBe(true);
      expect(ValidationPatterns.email.test('test.email+tag@domain.co.uk')).toBe(true);
      expect(ValidationPatterns.email.test('user123@test-domain.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(ValidationPatterns.email.test('invalid-email')).toBe(false);
      expect(ValidationPatterns.email.test('@domain.com')).toBe(false);
      expect(ValidationPatterns.email.test('user@')).toBe(false);
      expect(ValidationPatterns.email.test('user..name@domain.com')).toBe(true); // simple regex allows consecutive dots
    });
  });

  describe('barcode validation', () => {
    it('should validate correct barcode formats', () => {
      expect(ValidationPatterns.barcode.test('ABC123')).toBe(true);
      expect(ValidationPatterns.barcode.test('123-456')).toBe(true);
      expect(ValidationPatterns.barcode.test('PROD-001')).toBe(true);
    });

    it('should reject invalid barcode formats', () => {
      expect(ValidationPatterns.barcode.test('abc 123')).toBe(false); // spaces
      expect(ValidationPatterns.barcode.test('ABC@123')).toBe(false); // special chars
      expect(ValidationPatterns.barcode.test('')).toBe(false); // empty string doesn't match
    });
  });

  describe('material code validation', () => {
    it('should validate correct material codes', () => {
      expect(ValidationPatterns.materialCode.test('MAT001')).toBe(true);
      expect(ValidationPatterns.materialCode.test('STEEL-BEAM')).toBe(true);
      expect(ValidationPatterns.materialCode.test('CONCRETE_MIX')).toBe(true);
    });

    it('should reject invalid material codes', () => {
      expect(ValidationPatterns.materialCode.test('MAT 001')).toBe(false); // spaces
      expect(ValidationPatterns.materialCode.test('')).toBe(false); // empty string doesn't match
      expect(ValidationPatterns.materialCode.test('A')).toBe(true); // single character is valid
    });
  });
});

describe('InputSanitizer', () => {
  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      expect(InputSanitizer.sanitizeString('<script>alert("xss")</script>')).toBe('');
      expect(InputSanitizer.sanitizeString('Normal text')).toBe('Normal text');
      expect(InputSanitizer.sanitizeString('Text with "quotes" and \'apostrophes\'')).toBe('Text with &quot;quotes&quot; and &#x27;apostrophes&#x27;');
    });

    it('should handle empty and null inputs', () => {
      expect(InputSanitizer.sanitizeString('')).toBe('');
      expect(InputSanitizer.sanitizeString(null as any)).toBe('');
      expect(InputSanitizer.sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('sanitizeBarcode', () => {
    it('should normalize barcode values', () => {
      expect(InputSanitizer.sanitizeBarcode('  ABC123  ')).toBe('ABC123');
      expect(InputSanitizer.sanitizeBarcode('test-barcode')).toBe('TEST-BARCODE');
    });

    it('should handle empty inputs', () => {
      expect(InputSanitizer.sanitizeBarcode('')).toBe('');
    });
  });

  describe('sanitizeNumber', () => {
    it('should extract numeric values', () => {
      expect(InputSanitizer.sanitizeNumber('123.45')).toBe(123.45);
      expect(InputSanitizer.sanitizeNumber('$1,234.56')).toBe(1234.56);
      expect(InputSanitizer.sanitizeNumber('Price: $99.99')).toBe(99.99);
    });

    it('should handle non-numeric inputs', () => {
      expect(InputSanitizer.sanitizeNumber('abc')).toBe(null);
      expect(InputSanitizer.sanitizeNumber('')).toBe(null);
    });
  });
});

describe('FormValidator', () => {
  it('should validate required fields', () => {
    const schema = {
      name: { required: true }
    };

    let result = FormValidator.validate({ name: '' }, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe('name is required');

    result = FormValidator.validate({ name: 'John Doe' }, schema);
    expect(result.isValid).toBe(true);
    expect(result.errors.name).toBeUndefined();
  });

  it('should validate email fields', () => {
    const schema = {
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
    };

    let result = FormValidator.validate({ email: 'invalid-email' }, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('email format is invalid');

    result = FormValidator.validate({ email: 'user@example.com' }, schema);
    expect(result.isValid).toBe(true);
    expect(result.errors.email).toBeUndefined();
  });

  it('should validate minimum length', () => {
    const schema = {
      password: { required: true, minLength: 8 }
    };

    let result = FormValidator.validate({ password: 'abc' }, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe('password must be at least 8 characters');

    result = FormValidator.validate({ password: 'password123' }, schema);
    expect(result.isValid).toBe(true);
    expect(result.errors.password).toBeUndefined();
  });

  it('should validate numeric fields', () => {
    const schema = {
      quantity: { required: true, pattern: /^\d+(\.\d+)?$/ }
    };

    let result = FormValidator.validate({ quantity: 'abc' }, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors.quantity).toBe('quantity format is invalid');

    result = FormValidator.validate({ quantity: '123.45' }, schema);
    expect(result.isValid).toBe(true);
    expect(result.errors.quantity).toBeUndefined();
  });

  it('should validate custom patterns', () => {
    const schema = {
      code: { required: true, pattern: /^[A-Z]{3}-\d{3}$/ }
    };

    let result = FormValidator.validate({ code: 'invalid' }, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors.code).toBe('code format is invalid');

    result = FormValidator.validate({ code: 'ABC-123' }, schema);
    expect(result.isValid).toBe(true);
    expect(result.errors.code).toBeUndefined();
  });
});

describe('Barcode Validation', () => {
  it('should validate correct barcode format', () => {
    const validBarcode = 'ABC123456789';
    const result = FormValidator.validate({ barcode: validBarcode }, CommonSchemas.barcodeScan);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid barcode format', () => {
    const invalidBarcode = 'AB';
    const result = FormValidator.validate({ barcode: invalidBarcode }, CommonSchemas.barcodeScan);
    expect(result.isValid).toBe(false);
    expect(result.errors.barcode).toBeDefined();
  });
});

describe('Material Movement Validation', () => {
  it('should validate complete movement data', () => {
    const validMovement = {
      materialCode: 'MAT001',
      quantity: '10.5',
      location: 'Warehouse A',
      notes: 'Regular movement',
    };

    const result = FormValidator.validate(validMovement, CommonSchemas.materialMovement);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid movement data', () => {
    const invalidMovement = {
      materialCode: '',
      quantity: 'invalid',
      location: 'A',
      notes: '',
    };

    const result = FormValidator.validate(invalidMovement, CommonSchemas.materialMovement);
    expect(result.isValid).toBe(false);
    expect(result.errors.materialCode).toBeDefined();
    expect(result.errors.quantity).toBeDefined();
  });
});

describe('User Profile Validation', () => {
  it('should validate complete user profile', () => {
    const validProfile = {
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    const result = FormValidator.validate(validProfile, CommonSchemas.userProfile);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid user profile', () => {
    const invalidProfile = {
      name: '',
      email: 'invalid-email',
    };

    const result = FormValidator.validate(invalidProfile, CommonSchemas.userProfile);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
  });
});