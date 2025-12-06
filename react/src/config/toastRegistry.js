export const TOAST_TAGS = {
  PROJECT_TYPE_REQUIRED: 'PROJECT_TYPE_REQUIRED',
  CHECK_UNSUPPORTED: 'CHECK_UNSUPPORTED',
  CHECK_COMPLETE: 'CHECK_COMPLETE',
  PROJECT_SUBMITTED: 'PROJECT_SUBMITTED',
  PRODUCT_MISSING_ID: 'PRODUCT_MISSING_ID',
  GENERIC_ERROR: 'GENERIC_ERROR',
  DEBUG_INFO: 'DEBUG_INFO',
  REHYDRATION_APPLIED: 'REHYDRATION_APPLIED',
  INVALID_JSON: 'INVALID_JSON',
  CALCULATION_COMPLETE: 'CALCULATION_COMPLETE',
  MATERIALS_DATA: 'MATERIALS_DATA',
  NO_MATERIALS_DATA: 'NO_MATERIALS_DATA',
  SCHEMA_SUBMIT_NOT_IMPLEMENTED: 'SCHEMA_SUBMIT_NOT_IMPLEMENTED',
  DXF_DOWNLOAD_FAILED: 'DXF_DOWNLOAD_FAILED',
  PDF_DOWNLOAD_FAILED: 'PDF_DOWNLOAD_FAILED',
};

export const TOAST_MESSAGES = {
  [TOAST_TAGS.PROJECT_TYPE_REQUIRED]: "Please select a project type first.",
  [TOAST_TAGS.CHECK_UNSUPPORTED]: "Check unsupported: product has no product_id (dbId).",
  [TOAST_TAGS.CHECK_COMPLETE]: "Check complete1",
  [TOAST_TAGS.PROJECT_SUBMITTED]: "Project submitted successfully!",
  [TOAST_TAGS.PRODUCT_MISSING_ID]: "This product cannot be created yet (missing product_id).",
  [TOAST_TAGS.GENERIC_ERROR]: (err) => `Error: ${err}`,
  [TOAST_TAGS.DEBUG_INFO]: (info) => JSON.stringify(info ?? {}, null, 2),
  [TOAST_TAGS.REHYDRATION_APPLIED]: "Rehydration applied.",
  [TOAST_TAGS.INVALID_JSON]: (msg) => `Invalid JSON: ${msg}`,
  [TOAST_TAGS.CALCULATION_COMPLETE]: "Calculation complete!",
  [TOAST_TAGS.MATERIALS_DATA]: (mats) => JSON.stringify(mats, null, 2),
  [TOAST_TAGS.NO_MATERIALS_DATA]: "No materials data available.",
  [TOAST_TAGS.SCHEMA_SUBMIT_NOT_IMPLEMENTED]: "Schema submit not implemented yet; preview uses the edited schema.",
  [TOAST_TAGS.DXF_DOWNLOAD_FAILED]: (msg) => msg || 'Failed to download DXF',
  [TOAST_TAGS.PDF_DOWNLOAD_FAILED]: (msg) => msg || 'Failed to download PDF',
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
