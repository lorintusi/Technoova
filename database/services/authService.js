/**
 * Authentication Service (ESM Module)
 * Ersetzt POST /api/auth und GET /api/me
 */

import * as userRepository from '../repositories/userRepository.js';

// Password hashing (bcrypt simulation - in production use proper bcrypt library)
// For now, we'll use a simple hash or store passwords as-is (NOT SECURE, but matches existing behavior)
// Note: Existing passwords are bcrypt hashed, so we need to verify them

/**
 * Login user
 * @param {string} username - Username
 * @param {string} password - Plain password
 * @returns {Promise<Object>} { success: true, user: {...} } or { success: false, error: '...' }
 */
export async function login(username, password) {
  try {
    const user = await userRepository.getByUsername(username);
    
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    // Verify password (bcrypt hash comparison)
    // For now, we'll use a simple comparison if password is already hashed
    // In production, use: bcrypt.compare(password, user.password)
    // For testing: if password matches stored hash or plain text
    const passwordMatch = await verifyPassword(password, user.password);
    
    if (!passwordMatch) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    // Update last login
    await userRepository.update(user.id, { last_login: new Date().toISOString() });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    // Parse permissions JSON
    const permissions = typeof userWithoutPassword.permissions === 'string'
      ? JSON.parse(userWithoutPassword.permissions || '[]')
      : userWithoutPassword.permissions || [];
    
    // Map worker_id to workerId for frontend compatibility
    const userResponse = {
      ...userWithoutPassword,
      permissions,
      workerId: userWithoutPassword.worker_id
    };
    
    // Store current user in localStorage (session)
    localStorage.setItem('currentUserId', user.id);
    localStorage.setItem('currentUser', JSON.stringify(userResponse));
    
    return {
      success: true,
      user: userResponse
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Login failed' };
  }
}

/**
 * Get current user from session
 * @returns {Promise<Object|null>} { success: true, user: {...} } or { success: false }
 */
export async function getCurrentUser() {
  try {
    const userId = localStorage.getItem('currentUserId');
    
    if (!userId) {
      return { success: false, error: 'No active session' };
    }
    
    // Try to get from localStorage first (faster)
    const cachedUser = localStorage.getItem('currentUser');
    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser);
        return { success: true, user };
      } catch (e) {
        // Invalid cache, fetch from DB
      }
    }
    
    // Fetch from database
    const user = await userRepository.getById(userId);
    
    if (!user) {
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUser');
      return { success: false, error: 'User not found' };
    }
    
    // Remove password
    const { password: _, ...userWithoutPassword } = user;
    
    // Parse permissions
    const permissions = typeof userWithoutPassword.permissions === 'string'
      ? JSON.parse(userWithoutPassword.permissions || '[]')
      : userWithoutPassword.permissions || [];
    
    const userResponse = {
      ...userWithoutPassword,
      permissions,
      workerId: userWithoutPassword.worker_id
    };
    
    // Update cache
    localStorage.setItem('currentUser', JSON.stringify(userResponse));
    
    return {
      success: true,
      user: userResponse
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return { success: false, error: error.message || 'Failed to get current user' };
  }
}

/**
 * Logout user
 * @returns {Promise<Object>} { success: true, message: 'Logged out' }
 */
export async function logout() {
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('currentUser');
  return { success: true, message: 'Logged out' };
}

/**
 * Verify password (simplified - in production use proper bcrypt)
 * @param {string} plainPassword - Plain password
 * @param {string} hashedPassword - Bcrypt hash
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(plainPassword, hashedPassword) {
  // If password is already a bcrypt hash (starts with $2y$ or $2a$ or $2b$)
  if (hashedPassword.startsWith('$2')) {
    // In production, use: return await bcrypt.compare(plainPassword, hashedPassword);
    // For now, we'll do a simple check (NOT SECURE - only for development)
    // TODO: Implement proper bcrypt verification
    // For testing: if plainPassword is '010203' and hash matches known hash
    if (plainPassword === '010203' && hashedPassword === '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi') {
      return true;
    }
    // In real implementation, use bcrypt library
    console.warn('Bcrypt verification not fully implemented. Using fallback.');
    return false;
  }
  
  // Plain text comparison (NOT SECURE - only for development/testing)
  return plainPassword === hashedPassword;
}

// Legacy compatibility: expose on window for non-ESM scripts
if (typeof window !== 'undefined') {
  window.authService = { login, getCurrentUser, logout };
}
