/**
 * Utility functions for date and time formatting
 */

/**
 * Get the local date string in YYYY-MM-DD format
 * @param date - The date to format (defaults to now)
 * @returns The formatted date string
 */
export function getLocalDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get the local time string in HH:MM format
 * @param date - The date to format (defaults to now)
 * @returns The formatted time string
 */
export function getLocalTimeString(date: Date = new Date()): string {
  return date.toTimeString().split(' ')[0].substring(0, 5);
}