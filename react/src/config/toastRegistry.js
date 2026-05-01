export const TOAST_TAGS = {
  REHYDRATION_APPLIED: 'REHYDRATION_APPLIED',
  INVALID_JSON: 'INVALID_JSON',
};

export const TOAST_MESSAGES = {
  [TOAST_TAGS.REHYDRATION_APPLIED]: "Rehydration applied.",
  [TOAST_TAGS.INVALID_JSON]: (msg) => `Invalid JSON: ${msg}`,
};

/**
 * Resolves a toast message from a tag or returns the message itself if not found.
 * @param {string} tag - The toast tag or message.
 * @param {...any} args - Arguments for dynamic messages.
 * @returns {string} The resolved message.
 */
export const resolveToastMessage = (tag, ...args) => {
  const msg = TOAST_MESSAGES[tag];
  if (typeof msg === 'function') {
    return msg(...args);
  }
  return msg || tag;
};
