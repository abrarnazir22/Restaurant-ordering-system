const mongoose = require('mongoose');

/**
 * Escapes regex special characters to prevent ReDoS or unintended pattern matching.
 * @param {string} string 
 * @returns {string}
 */
function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates whether a given string is a valid MongoDB ObjectId.
 * @param {string} id 
 * @returns {boolean}
 */
function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Normalizes phone numbers for validation.
 * @param {string} raw 
 * @returns {string}
 */
function normalizePhone(raw) {
  return String(raw || '').trim().replace(/[\s()-]/g, '');
}

/**
 * Validates phone numbers supporting international (+E.164) and standard domestic formats.
 * @param {string} raw 
 * @returns {boolean}
 */
function isValidPhone(raw) {
  const clean = normalizePhone(raw);
  return /^(\+?[1-9]\d{6,14}|0\d{9,11})$/.test(clean);
}

/**
 * Validates that date and time combination is strictly in the future.
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} timeStr 'HH:MM'
 * @param {number} minBufferMinutes minimum minutes in future required (default: 15)
 * @returns {{ valid: boolean, error?: string, targetDate?: Date }}
 */
function validateFutureDateTime(dateStr, timeStr, minBufferMinutes = 15) {
  if (!dateStr || !timeStr) {
    return { valid: false, error: 'Date and time are required.' };
  }

  // Ensure format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { valid: false, error: 'Invalid date format. Expected YYYY-MM-DD.' };
  }
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    return { valid: false, error: 'Invalid time format. Expected HH:MM.' };
  }

  const [hours, minutes] = timeStr.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { valid: false, error: 'Invalid time values.' };
  }

  const bookingTime = new Date(`${dateStr}T${timeStr}:00`);
  if (isNaN(bookingTime.getTime())) {
    return { valid: false, error: 'Invalid date/time combination.' };
  }

  const now = new Date();
  const minAllowed = new Date(now.getTime() + minBufferMinutes * 60 * 1000);

  if (bookingTime.getTime() < now.getTime()) {
    return { valid: false, error: 'Cannot book a reservation for a time that has already passed.' };
  }

  if (bookingTime.getTime() < minAllowed.getTime()) {
    return { valid: false, error: `Reservations must be made at least ${minBufferMinutes} minutes in advance.` };
  }

  return { valid: true, targetDate: bookingTime };
}

module.exports = {
  escapeRegex,
  isValidObjectId,
  normalizePhone,
  isValidPhone,
  validateFutureDateTime
};
