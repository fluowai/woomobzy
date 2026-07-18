const isDev = process.env.NODE_ENV !== 'production';

/**
 * Returns a safe error message for API responses.
 * In production, returns a generic message to avoid leaking internals.
 * In development, returns the original error message for debugging.
 */
export function safeErrorMessage(err) {
  if (isDev) {
    return err?.message || 'Erro interno do servidor';
  }
  return 'Erro interno do servidor';
}

/**
 * Sends a standardized 500 error response without leaking internals.
 */
export function send500(res, err, context = '') {
  if (context) {
    console.error(`[${context}]`, err.message);
  } else {
    console.error('Server error:', err.message);
  }
  return res.status(500).json({
    success: false,
    error: safeErrorMessage(err),
  });
}
