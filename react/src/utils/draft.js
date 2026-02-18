export function discardDraftAndCloseInline() {
  try {
    localStorage.removeItem('autodraw_draft');
  } catch {
    // ignore
  }

  // If the bottom-bar ProjectInline is mounted (even hidden), ensure it unmounts and stops autosaving.
  try {
    window.dispatchEvent(
      new CustomEvent('autodraw:close-project-inline', { detail: { discardDraft: true } })
    );
  } catch {
    // ignore
  }
}
