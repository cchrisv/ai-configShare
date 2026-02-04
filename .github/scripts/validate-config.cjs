#!/usr/bin/env node

/**
 * validate-config.js
 *
 * Validates all JSON configuration files against their JSON schemas.
 * Uses ajv for JSON Schema validation.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT, 'config');

// Try to load ajv, but don't fail if it's not installed
let Ajv;
try {
  Ajv = require('ajv');
} catch (e) {
  console.error('Error: ajv package not found. Install with: npm install ajv');
  console.error('For now, performing basic JSON syntax validation only.');
  Ajv = null;
}

const configFiles = [
  {
    file: 'template-variables.json',
    schema: 'template-variables.schema.json'
  },
  {
    file: 'step-manifests.json',
    schema: 'step-manifests.schema.json'
  },
  {
    file: 'templatized-workflow.json',
    schema: 'templatized-workflow.schema.json'
  }
];

function validateJSONSyntax(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function validateWithSchema(filePath, schemaPath) {
  if (!Ajv) {
    // Fallback to JSON syntax validation only
    return validateJSONSyntax(filePath);
  }

  try {
    const ajv = new Ajv({ allErrors: true, verbose: true });
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (!valid) {
      return {
        valid: false,
        error: ajv.errorsText(validate.errors, { dataVar: 'config' })
      };
    }

    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function main() {
  console.log('Validating configuration files...\n');

  let hasErrors = false;
  const errors = [];

  for (const config of configFiles) {
    const filePath = path.join(CONFIG_DIR, config.file);
    const schemaPath = path.join(CONFIG_DIR, config.schema);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${config.file}: File not found (skipping)`);
      continue;
    }

    if (!fs.existsSync(schemaPath)) {
      console.log(`⚠️  ${config.file}: Schema not found, performing JSON syntax check only`);
      const result = validateJSONSyntax(filePath);
      if (!result.valid) {
        console.log(`❌ ${config.file}: ${result.error}`);
        errors.push(`${config.file}: ${result.error}`);
        hasErrors = true;
      } else {
        console.log(`✓  ${config.file}: Valid JSON`);
      }
      continue;
    }

    const result = validateWithSchema(filePath, schemaPath);
    if (!result.valid) {
      console.log(`❌ ${config.file}: ${result.error}`);
      errors.push(`${config.file}: ${result.error}`);
      hasErrors = true;
    } else {
      console.log(`✓  ${config.file}: Valid`);
    }
  }

  console.log('');

  if (hasErrors) {
    console.error('Validation failed. Please fix the errors above.');
    process.exit(1);
  } else {
    console.log('All configuration files are valid!');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateJSONSyntax, validateWithSchema };

