import { describe, it, expect } from '@jest/globals';
import {
  ValidationPatterns,
  sanitizeInput,
  sanitizeEmail,
  sanitizeNumeric,
  ValidationError,
  FormValidator,
  BarcodeValidator,
  MaterialMovementValidator,
  UserProfileValidator,
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
      expect(ValidationPatterns.email.test('user..name@domain.com')).toBe(false);
    });
  });

  describe('barcode validation', () => {
    it('should validate correct barcode formats', () => {
      expect(ValidationPatterns.barcode.test('1234567890123')).toBe(true); // 13 digits
      expect(ValidationPatterns.barcode.test('123456789012')).toBe(true); // 12 digits
      expect(ValidationPatterns.barcode.test('12345678')).toBe(true); // 8 digits
    });

    it('should reject invalid barcode formats', () => {
      expect(ValidationPatterns.barcode.test('1234567')).toBe(false); // too short
      expect(ValidationPatterns.barcode.test('12345678901234')).toBe(false); // too long
      expect(ValidationPatterns.barcode.test('ABC123456789')).toBe(false); // contains letters
      expect(ValidationPatterns.barcode.test('')).toBe(false); // empty
    });
  });

  describe('material code validation', () => {
    it('should validate correct material codes', () => {
      expect(ValidationPatterns.materialCode.test('MAT-001')).toBe(true);
      expect(ValidationPatterns.materialCode.test('STEEL_BEAM_001')).toBe(true);
      expect(ValidationPatterns.materialCode.test('CONCRETE-MIX-123')).toBe(true);
    });

    it('should reject invalid material codes', () => {
      expect(ValidationPatterns.materialCode.test('mat@001')).toBe(false); // special chars
      expect(ValidationPatterns.materialCode.test('MAT 001')).toBe(false); // spaces
      expect(ValidationPatterns.materialCode.test('')).toBe(false); // empty
      expect(ValidationPatterns.materialCode.test('A')).toBe(false); // too short
    });
  });
});

describe('Sanitization Functions', () => {
  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('SELECT * FROM users;')).toBe('SELECT * FROM users;');
      expect(sanitizeInput('Normal text 123')).toBe('Normal text 123');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('\n\ttest\n\t')).toBe('test');
    });

    it('should handle empty and null inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize email addresses', () => {
      expect(sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
      expect(sanitizeEmail('Test.Email@Domain.Org')).toBe('test.email@domain.org');
    });

    it('should handle invalid emails', () => {
      expect(sanitizeEmail('invalid-email')).toBe('invalid-email');
      expect(sanitizeEmail('')).toBe('');
    });
  });

  describe('sanitizeNumeric', () => {
    it('should extract numeric values', () => {
      expect(sanitizeNumeric('123.45')).toBe('123.45');
      expect(sanitizeNumeric('$1,234.56')).toBe('1234.56');
      expect(sanitizeNumeric('Price: $99.99')).toBe('99.99');
    });

    it('should handle non-numeric inputs', () => {
      expect(sanitizeNumeric('abc')).toBe('');
      expect(sanitizeNumeric('')).toBe('');
    });
  });
});

describe('FormValidator', () => {
  let validator: FormValidator;

  beforeEach(() => {
    validator = new FormValidator();
  });

  it('should validate required fields', () => {
    validator.required('name', '');
    expect(validator.hasErrors()).toBe(true);
    expect(validator.getErrors()).toHaveProperty('name');

    validator.clearErrors();
    validator.required('name', 'John Doe');
    expect(validator.hasErrors()).toBe(false);
  });

  it('should validate email fields', () => {
    validator.email('email', 'invalid-email');
    expect(validator.hasErrors()).toBe(true);
    expect(validator.getErrors().email).toContain('Invalid email format');

    validator.clearErrors();
    validator.email('email', 'user@example.com');
    expect(validator.hasErrors()).toBe(false);
  });

  it('should validate minimum length', () => {
    validator.minLength('password', 'abc', 8);
    expect(validator.hasErrors()).toBe(true);
    expect(validator.getErrors().password).toContain('Must be at least 8 characters');

    validator.clearErrors();
    validator.minLength('password', 'password123', 8);
    expect(validator.hasErrors()).toBe(false);
  });

  it('should validate numeric fields', () => {
    validator.numeric('quantity', 'abc');
    expect(validator.hasErrors()).toBe(true);
    expect(validator.getErrors().quantity).toContain('Must be a valid number');

    validator.clearErrors();
    validator.numeric('quantity', '123.45');
    expect(validator.hasErrors()).toBe(false);
  });

  it('should validate custom patterns', () => {
    validator.pattern('code', 'invalid', /^[A-Z]{3}-\d{3}$/, 'Must match format ABC-123');
    expect(validator.hasErrors()).toBe(true);

    validator.clearErrors();
    validator.pattern('code', 'ABC-123', /^[A-Z]{3}-\d{3}$/, 'Must match format ABC-123');
    expect(validator.hasErrors()).toBe(false);
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