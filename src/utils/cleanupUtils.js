/**
 * Defensive utility to explicitly free memory during heavy operations.
 */
export function clearGarbage() {
  if (window.gc) {
    try {
      window.gc();
    } catch (e) {
      // Ignore
    }
  }
}

export function revokeBlobs(urls) {
  if (!Array.isArray(urls)) return;
  urls.forEach(url => {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
}
