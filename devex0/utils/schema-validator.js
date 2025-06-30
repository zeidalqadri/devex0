/**
 * Schema Validation Utilities
 * Handles Zod schema validation and data transformation
 */

export async function validateSchema(data, schema) {
  try {
    // If schema is a string, try to dynamically import it
    if (typeof schema === 'string') {
      const schemaModule = await import(`../schemas/${schema}.js`);
      schema = schemaModule.default || schemaModule[schema];
    }

    // Validate data against schema
    const result = schema.parse(data);
    
    console.log('[SchemaValidator] Validation successful');
    return result;

  } catch (error) {
    console.error('[SchemaValidator] Validation failed:', error);
    
    // Return original data with validation errors
    return {
      data,
      validationErrors: error.errors || [{ message: error.message }],
      isValid: false
    };
  }
}

export function createValidationSummary(validationResult) {
  if (validationResult.isValid === false) {
    return {
      valid: false,
      errorCount: validationResult.validationErrors.length,
      errors: validationResult.validationErrors,
      originalData: validationResult.data
    };
  }

  return {
    valid: true,
    data: validationResult,
    errorCount: 0
  };
}