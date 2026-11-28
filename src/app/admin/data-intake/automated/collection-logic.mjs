/**
 * @template {{ id: string }} T
 * @param {T[]} items
 * @param {T} item
 * @returns {T[]}
 */
export function upsertById(items, item) {
  const index = items.findIndex((current) => current.id === item.id);
  return index < 0
    ? [item, ...items]
    : items.map((current, currentIndex) => currentIndex === index ? item : current);
}

/**
 * @template {{ id: string }} T
 * @param {T[]} items
 * @param {string} id
 * @returns {T[]}
 */
export function removeById(items, id) {
  return items.filter((item) => item.id !== id);
}

/**
 * @param {string} value
 */
export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/**
 * @param {{ configId: string; startDate: string; time: string; timeZone: string; endDate: string }} schedule
 */
export function scheduleValidationError(schedule) {
  if (!schedule.configId || !schedule.startDate || !schedule.time || !schedule.timeZone.trim()) {
    return "Select a collection, start date, time, and time zone.";
  }
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: schedule.timeZone });
  } catch {
    return "Enter a valid time zone.";
  }
  if (schedule.endDate && schedule.endDate < schedule.startDate) {
    return "The end date must be on or after the start date.";
  }
  return "";
}

/**
 * @param {Date} date
 */
export function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
