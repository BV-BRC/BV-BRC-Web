/**
 * Security Utilities Module
 * Provides sanitization and validation functions for security-critical operations
 */

const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

/**
 * Sanitize email headers to prevent CRLF injection
 * Strips CR, LF, and null bytes from email header values
 * @param {string} value - The header value to sanitize
 * @returns {string} - Sanitized value
 */
function sanitizeEmailHeader(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }
  // Remove CRLF characters that could allow header injection
  return value.replace(/[\r\n\x00]/g, '').trim();
}

/**
 * Validate email format and sanitize for use in email headers
 * @param {string} email - The email address to validate and sanitize
 * @returns {string} - Sanitized email or empty string if invalid
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return '';
  }
  const sanitized = sanitizeEmailHeader(email);
  // Validate it's a proper email format
  if (!validator.isEmail(sanitized)) {
    return '';
  }
  return sanitized;
}

/**
 * Sanitize subject line for email - remove CRLF and limit length
 * @param {string} subject - The subject to sanitize
 * @param {number} maxLength - Maximum length (default 200)
 * @returns {string} - Sanitized subject
 */
function sanitizeEmailSubject(subject, maxLength = 200) {
  if (!subject || typeof subject !== 'string') {
    return '';
  }
  return sanitizeEmailHeader(subject).substring(0, maxLength);
}

/**
 * Validate and sanitize URL path for canonical URLs
 * Only allows safe URL characters and prevents injection
 * @param {string} urlPath - The URL path to sanitize
 * @returns {string} - Sanitized URL path
 */
function sanitizeUrlPath(urlPath) {
  if (!urlPath || typeof urlPath !== 'string') {
    return '';
  }
  // Remove any null bytes or control characters
  let sanitized = urlPath.replace(/[\x00-\x1f\x7f]/g, '');

  // Encode dangerous characters that could break out of attribute context
  sanitized = sanitized
    .replace(/"/g, '%22')
    .replace(/'/g, '%27')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E');

  // Ensure it starts with / and doesn't contain protocol injection
  if (!sanitized.startsWith('/')) {
    sanitized = '/' + sanitized;
  }

  // Prevent javascript: or data: URL schemes
  if (/^\/*(javascript|data|vbscript):/i.test(sanitized)) {
    return '/';
  }

  return sanitized;
}

/**
 * Validate that a URL is a safe HTTP/HTTPS URL
 * @param {string} str - URL to validate
 * @returns {boolean} - true if valid HTTP/HTTPS URL
 */
function isValidHttpUrl(str) {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize text content - strip all HTML tags
 * @param {string} text - The text to sanitize
 * @returns {string} - Sanitized text with no HTML
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  }).trim();
}

/**
 * Validate integer within range
 * @param {*} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} - Validated integer or default
 */
function validateIntegerInRange(value, min, max, defaultValue) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Validate value is from an allowed list
 * @param {*} value - Value to validate
 * @param {Array} allowedList - List of allowed values
 * @param {*} defaultValue - Default value if not in list
 * @returns {*} - Value if allowed, otherwise default
 */
function validateAllowedValue(value, allowedList, defaultValue) {
  if (allowedList.includes(value)) {
    return value;
  }
  return defaultValue;
}

module.exports = {
  sanitizeEmailHeader,
  sanitizeEmail,
  sanitizeEmailSubject,
  sanitizeUrlPath,
  isValidHttpUrl,
  sanitizeText,
  validateIntegerInRange,
  validateAllowedValue
};
