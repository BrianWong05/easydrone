// Utility functions for formatting match time display

/**
 * Format seconds to "x minute y second" format
 * @param {number} totalSeconds - Total seconds (e.g., 70 for 1 min 10 sec)
 * @returns {string} - Formatted string like "1 分鐘 10 秒"
 */
export const formatMatchDuration = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) {
    return '0 分鐘 0 秒';
  }
  
  const seconds = parseInt(totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds} 秒`;
  } else if (remainingSeconds === 0) {
    return `${minutes} 分鐘`;
  } else {
    return `${minutes} 分鐘 ${remainingSeconds} 秒`;
  }
};

/**
 * Format seconds to short format for tables
 * @param {number} totalSeconds - Total seconds
 * @returns {string} - Short format like "1:10"
 */
export const formatMatchDurationShort = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) {
    return '0:00';
  }
  
  const seconds = parseInt(totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Convert minutes and seconds to total seconds
 * @param {number} minutes - Whole minutes
 * @param {number} seconds - Seconds (0-59)
 * @returns {number} - Total seconds
 */
export const convertToSeconds = (minutes, seconds) => {
  const mins = parseInt(minutes || 0);
  const secs = parseInt(seconds || 0);
  return mins * 60 + secs;
};

/**
 * Convert total seconds back to minutes and seconds
 * @param {number} totalSeconds - Total seconds
 * @returns {object} - {minutes: number, seconds: number}
 */
export const convertFromSeconds = (totalSeconds) => {
  const total = parseInt(totalSeconds) || 0;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  
  // Debug logging
  console.log('Converting', totalSeconds, 'seconds -> minutes:', minutes, 'seconds:', seconds);
  
  return { minutes, seconds };
};