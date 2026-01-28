/**
 * Low-level API client
 * Handles HTTP requests to backend with timeout and standardized error format
 */

const API_BASE_URL = window.location.origin + '/backend/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Anfrage überschritt Zeitlimit');
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }
    throw error;
  }
}

/**
 * Generic request function
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}/${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Add credentials if user is logged in (session-based)
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
    credentials: 'include', // Include cookies for session
  };
  
  try {
    const response = await fetchWithTimeout(url, mergedOptions);
    
    // Try to parse JSON, but handle non-JSON responses
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      // Don't trigger auth:unauthorized for non-JSON responses
      const error = new Error(`Server returned non-JSON response: ${response.status}`);
      error.code = 'BAD_RESPONSE';
      error.status = response.status;
      error.userMessage = 'Serverfehler (ungültige Antwort)';
      throw error;
    }
    
    if (!response.ok) {
      // New format: { ok: false, error: { code, message, fieldErrors?, details? } }
      // Old format: { success: false, error: string }
      
      let errorCode, errorMessage, fieldErrors, details;
      
      if (data.ok === false && data.error) {
        // New standardized format
        errorCode = data.error.code;
        errorMessage = data.error.message;
        fieldErrors = data.error.fieldErrors;
        details = data.error.details;
      } else if (data.success === false && data.error) {
        // Old format
        errorMessage = data.error;
      } else {
        // Fallback
        errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
      }
      
      console.error(`API Error (${response.status}):`, { errorCode, errorMessage, fieldErrors });
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.code = errorCode || `HTTP_${response.status}`;
      error.fieldErrors = fieldErrors || {};
      error.details = details;
      
      // User-friendly messages for common status codes
      if (response.status === 401) {
        error.userMessage = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';
        // Trigger global auth handler ONLY for genuine 401 from server
        console.warn('[API Client] 401 Unauthorized from server. Triggering auth:unauthorized');
        document.dispatchEvent(new CustomEvent('auth:unauthorized', { 
          detail: { endpoint, status: 401, message: errorMessage }
        }));
      } else if (response.status === 403) {
        error.userMessage = 'Keine Berechtigung für diese Aktion.';
      } else if (response.status === 404) {
        error.userMessage = 'Nicht gefunden';
      } else if (response.status === 409) {
        error.userMessage = errorMessage; // Conflict message from backend
      } else if (response.status >= 500) {
        error.userMessage = 'Serverfehler. Bitte versuchen Sie es später erneut.';
      } else {
        error.userMessage = errorMessage;
      }
      
      throw error;
    }
    
    // Support both new format { ok: true, data } and old format { success: true, data/user/items }
    // Log response format for debugging
    const responseType = data.ok ? 'ok' : data.success ? 'success' : Array.isArray(data) ? 'array' : 'raw';
    console.log(`[API Client] ${endpoint} response type: ${responseType}`, {
      ok: data.ok,
      success: data.success,
      hasData: data.data !== undefined,
      hasUser: data.user !== undefined,
      hasItems: data.items !== undefined,
      isArray: Array.isArray(data)
    });
    
    if (data.ok === true) {
      return data.data; // New format: return unwrapped data
    } else if (data.success === true) {
      // Old format: return data field if exists, otherwise whole response
      return data.data || data; // This preserves { success: true, user: {...} } format for auth
    } else if (Array.isArray(data)) {
      return data; // Direct array response
    }
    
    return data;
  } catch (error) {
    console.error('API Request Error:', {
      endpoint,
      url,
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Enhanced error messages for network issues
    if (error.code === 'TIMEOUT') {
      error.userMessage = 'Server antwortet nicht (Zeitüberschreitung)';
      throw error;
    }
    
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      const friendlyError = new Error('Verbindung zum Server fehlgeschlagen');
      friendlyError.code = 'NETWORK_ERROR';
      friendlyError.userMessage = 'Keine Verbindung zum Server. Bitte überprüfen Sie Ihre Internetverbindung.';
      friendlyError.originalError = error;
      throw friendlyError;
    }
    
    throw error;
  }
}

/**
 * GET request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<object>} Response data
 */
export async function get(endpoint) {
  return request(endpoint, { method: 'GET' });
}

/**
 * POST request
 * @param {string} endpoint - API endpoint
 * @param {object} body - Request body
 * @returns {Promise<object>} Response data
 */
export async function post(endpoint, body) {
  return request(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request
 * @param {string} endpoint - API endpoint
 * @param {object} body - Request body
 * @returns {Promise<object>} Response data
 */
export async function put(endpoint, body) {
  return request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<object>} Response data
 */
export async function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

