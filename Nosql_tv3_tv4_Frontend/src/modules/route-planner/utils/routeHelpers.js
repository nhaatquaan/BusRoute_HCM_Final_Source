/**
 * Helper utility functions for Route Planner module
 */

export function formatDistance(meters) {
  if (meters === undefined || meters === null) return '--';
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(minutes) {
  if (minutes === undefined || minutes === null) return '--';
  if (minutes < 60) {
    return `${minutes} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours} giờ ${remainingMins} phút` : `${hours} giờ`;
}

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '--';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Remove Vietnamese accents for fast fuzzy search
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return str.toLowerCase();
}

/**
 * Filter items by search text
 */
export function matchSearch(text, query) {
  if (!text || !query) return false;
  const rawText = removeVietnameseTones(text);
  const rawQuery = removeVietnameseTones(query);
  return rawText.includes(rawQuery);
}
