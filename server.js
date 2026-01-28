import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalents for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Persistence functions
function loadData(resource) {
  const filePath = path.join(DATA_DIR, `${resource}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading ${resource}:`, error.message);
  }
  return null;
}

function saveData(resource, data) {
  const filePath = path.join(DATA_DIR, `${resource}.json`);
  const tempPath = filePath + '.tmp';
  
  try {
    // Write to temp file first (atomic write)
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    // Rename temp to actual file (atomic on most systems)
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`Error saving ${resource}:`, error.message);
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    return false;
  }
}

function saveMockDB() {
  // Save all resources
  const resources = ['users', 'workers', 'teams', 'locations', 'assignments', 'week_planning', 'time_entries', 'medical_certificates', 'vehicles', 'devices', 'dispatch_items', 'dispatch_assignments', 'todos'];
  resources.forEach(resource => {
    saveData(resource, { items: mockDB[resource], nextId: nextId[resource] });
  });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// Default data (used if files don't exist)
const defaultData = {
  users: [
    {
      id: 1,
      username: 'admin',
      name: 'Admin User',
      email: 'admin@technoova.app',
      role: 'Admin',
      permissions: JSON.stringify(['Lesen', 'Schreiben', 'Verwalten', 'manage_users', 'plan', 'view_all']),
      worker_id: null,
      first_login: false,
      last_login: new Date().toISOString()
    },
    {
      id: 2,
      username: 'test1',
      name: 'Test User',
      email: 'test1@technoova.app',
      role: 'Worker',
      permissions: JSON.stringify(['Lesen', 'view_own']),
      worker_id: 2,
      first_login: false,
      last_login: new Date().toISOString()
    }
  ],
  workers: [
    { id: 1, name: 'AFT Bau', role: 'Montageteam', company: 'AFT Bau GmbH', team_id: 1, status: 'Arbeitsbereit', contact_phone: '+41 44 123 45 67', contact_email: 'leitstelle@aftbau.ch', availability: JSON.stringify([]) },
    { id: 2, name: 'Ivan Majanovic', role: 'Monteur', company: 'AFT Bau GmbH', team_id: 1, status: 'Arbeitsbereit', contact_phone: '+41 79 555 12 34', contact_email: 'ivan.majanovic@aftbau.ch', availability: JSON.stringify([]) },
    { id: 3, name: 'Josip Klaric', role: 'Monteur', company: 'AFT Bau GmbH', team_id: 1, status: 'Arbeitsbereit', contact_phone: '+41 78 666 33 11', contact_email: 'josip.klaric@aftbau.ch', availability: JSON.stringify([]) },
    { id: 4, name: 'Petra Meier', role: 'Elektrikerin', company: 'Elektro Meier AG', team_id: 2, status: 'Urlaub', contact_phone: '+41 79 888 44 22', contact_email: 'petra.meier@elektro-meier.ch', availability: JSON.stringify([]) }
  ],
  teams: [
    { id: 1, name: 'AFT Bau', type: 'intern', company: 'AFT Bau GmbH', description: 'Montageteam für Geländermontage', contact_phone: '+41 44 123 45 67', contact_email: 'leitstelle@aftbau.ch', contact_address: 'Musterstrasse 1, 8000 Zürich', members: JSON.stringify([1, 2, 3]), is_active: true, created_at: '2025-01-15' },
    { id: 2, name: 'Elektro Meier', type: 'extern', company: 'Elektro Meier AG', description: 'Externes Elektrik-Team', contact_phone: '+41 44 555 88 99', contact_email: 'info@elektro-meier.ch', contact_address: 'Elektrostrasse 10, 8001 Zürich', members: JSON.stringify([4]), is_active: true, created_at: '2025-02-01' }
  ],
  locations: [
    { id: 1, code: '25-001 Stäfa, Etzelstrasse 32', address: 'Etzelstrasse 32, 8712 Stäfa', description: 'Geländermontage in einer Wohnung', status: 'In Ausführung', created_at: '2025-11-14' },
    { id: 2, code: '25-002 Zürich, Hafenstrasse 11', address: 'Hafenstrasse 11, 8005 Zürich', description: 'Stahlkonstruktion Dach', status: 'Geplant', created_at: '2025-11-15' }
  ],
  assignments: [],
  week_planning: [],
  time_entries: [],
  medical_certificates: [],
  vehicles: [],
  devices: [],
  dispatch_items: [],
  dispatch_assignments: [],
  todos: []
};

const defaultNextId = {
  users: 3,
  workers: 5,
  teams: 3,
  locations: 3,
  assignments: 1,
  week_planning: 1,
  time_entries: 1,
  medical_certificates: 1,
  vehicles: 1,
  devices: 1,
  dispatch_items: 1,
  dispatch_assignments: 1,
  todos: 1
};

// Load or initialize database
let mockDB = {};
let nextId = {};

const resources = ['users', 'workers', 'teams', 'locations', 'assignments', 'week_planning', 'time_entries', 'medical_certificates', 'vehicles', 'devices', 'dispatch_items', 'dispatch_assignments', 'todos'];

resources.forEach(resource => {
  const loaded = loadData(resource);
  if (loaded && loaded.items && loaded.nextId) {
    mockDB[resource] = loaded.items;
    nextId[resource] = loaded.nextId;
    console.log(`✓ Loaded ${resource}: ${loaded.items.length} items`);
  } else {
    mockDB[resource] = defaultData[resource] || [];
    nextId[resource] = defaultNextId[resource] || 1;
    // Save default data
    saveData(resource, { items: mockDB[resource], nextId: nextId[resource] });
    console.log(`✓ Initialized ${resource} with default data`);
  }
});

// ========== SESSION MANAGEMENT ==========
// In-memory session store (for dev/demo - does NOT survive server restart)
const sessions = new Map(); // Map<sessionId, userId>

/**
 * Generate random session ID
 */
function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Parse cookies from request
 * @param {http.IncomingMessage} req 
 * @returns {object} Parsed cookies
 */
function parseCookies(req) {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      cookies[name.trim()] = decodeURIComponent(rest.join('='));
    });
  }
  return cookies;
}

/**
 * Get current user from session
 * @param {http.IncomingMessage} req 
 * @returns {object|null} User object or null
 */
function getSessionUser(req) {
  const cookies = parseCookies(req);
  const sessionId = cookies.session;
  
  if (!sessionId) {
    return null;
  }
  
  const userId = sessions.get(sessionId);
  if (!userId) {
    return null;
  }
  
  const user = mockDB.users.find(u => u.id === userId);
  return user || null;
}

/**
 * Create session for user
 * @param {number} userId 
 * @returns {string} Session ID
 */
function createSession(userId) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, userId);
  console.log(`[Session] Created session ${sessionId} for user ${userId}`);
  return sessionId;
}

/**
 * Destroy session
 * @param {string} sessionId 
 */
function destroySession(sessionId) {
  if (sessions.has(sessionId)) {
    console.log(`[Session] Destroyed session ${sessionId}`);
    sessions.delete(sessionId);
  }
}

// Helper function to normalize data for frontend
function normalizeData(item, type) {
  const normalized = { ...item };
  
  if (normalized.permissions && typeof normalized.permissions === 'string') {
    try {
      normalized.permissions = JSON.parse(normalized.permissions);
    } catch (e) {
      normalized.permissions = [];
    }
  }
  
  if (normalized.worker_id !== undefined) {
    normalized.workerId = normalized.worker_id;
  }
  
  if (normalized.first_login !== undefined) {
    normalized.firstLogin = normalized.first_login;
  }
  
  if (type === 'worker') {
    if (normalized.contact_phone || normalized.contact_email) {
      normalized.contact = {
        phone: normalized.contact_phone || '',
        email: normalized.contact_email || ''
      };
      delete normalized.contact_phone;
      delete normalized.contact_email;
    }
    if (normalized.availability && typeof normalized.availability === 'string') {
      try {
        normalized.availability = JSON.parse(normalized.availability);
      } catch (e) {
        normalized.availability = [];
      }
    }
  }
  
  if (type === 'team') {
    if (normalized.members && typeof normalized.members === 'string') {
      try {
        normalized.members = JSON.parse(normalized.members);
      } catch (e) {
        normalized.members = [];
      }
    }
    if (normalized.contact_phone || normalized.contact_email || normalized.contact_address) {
      normalized.contact = {
        phone: normalized.contact_phone || '',
        email: normalized.contact_email || '',
        address: normalized.contact_address || ''
      };
      delete normalized.contact_phone;
      delete normalized.contact_email;
      delete normalized.contact_address;
    }
    normalized.isActive = normalized.is_active !== undefined ? normalized.is_active : true;
  }
  
  return normalized;
}

// Node.js API - vollständig funktionales Backend ohne PHP
function handleAPI(urlPath, req, res) {
  // Parse request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    let requestData = {};
    try {
      if (body) {
        requestData = JSON.parse(body);
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    // Parse path: /backend/api/auth -> auth
    const pathParts = urlPath.replace('/backend/api/', '').split('/').filter(p => p);
    const resource = pathParts[0] || '';
    // Only parse as ID if it's numeric
    const id = (pathParts[1] && !isNaN(pathParts[1])) ? parseInt(pathParts[1]) : null;
    
    // Handle auth endpoints
    if (resource === 'auth' && req.method === 'POST') {
      const action = requestData.action || 'login';
      
      if (action === 'login') {
        const username = requestData.username || '';
        const password = requestData.password || '';
        
        if ((username === 'admin' && password === '010203') || (username === 'test1' && password === '010203')) {
          const user = mockDB.users.find(u => u.username === username);
          if (user) {
            // Create session
            const sessionId = createSession(user.id);
            
            // Set session cookie
            res.setHeader('Set-Cookie', `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax`);
            
            const normalized = normalizeData(user, 'user');
            console.log(`[Auth] User ${username} logged in successfully`);
            sendJSONResponse(res, 200, {
              success: true,
              user: normalized
            });
            return;
          }
        }
        console.log(`[Auth] Failed login attempt for username: ${username}`);
        sendJSONResponse(res, 401, {
          success: false,
          error: 'Invalid credentials'
        });
        return;
      } else if (action === 'logout') {
        // Destroy session
        const cookies = parseCookies(req);
        const sessionId = cookies.session;
        if (sessionId) {
          destroySession(sessionId);
        }
        
        // Clear session cookie
        res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
        
        console.log(`[Auth] User logged out`);
        sendJSONResponse(res, 200, {
          success: true,
          message: 'Logged out'
        });
        return;
      }
    }
    
    // Handle test endpoint
    if (resource === 'test' && req.method === 'GET') {
      sendJSONResponse(res, 200, {
        success: true,
        message: 'Technoova API is running (Node.js)',
        mode: 'NODE_API',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Handle me endpoint
    if (resource === 'me' && req.method === 'GET') {
      const user = getSessionUser(req);
      if (!user) {
        console.log('[Auth] GET /me - No valid session');
        sendJSONResponse(res, 401, {
          success: false,
          error: 'Not authenticated'
        });
        return;
      }
      
      console.log(`[Auth] GET /me - User: ${user.username}`);
      sendJSONResponse(res, 200, {
        success: true,
        user: normalizeData(user, 'user')
      });
      return;
    }
    
    // Handle special endpoints with sub-paths BEFORE generic CRUD
    
    // POST /backend/api/dispatch_assignments/bulk (Mehrere Tage gleichzeitig planen)
    if (pathParts.length >= 2 && pathParts[0] === 'dispatch_assignments' && pathParts[1] === 'bulk' && req.method === 'POST') {
      const { assignment_id, dates, worker_id, vehicle_ids, device_ids, notes } = requestData;
      
      if (!assignment_id || !dates || !Array.isArray(dates) || dates.length === 0 || !worker_id) {
        sendJSONResponse(res, 400, {
          success: false,
          error: 'assignment_id, dates (array), and worker_id are required'
        });
        return;
      }
      
      // Create dispatch_assignment for each date
      const created = [];
      for (const date of dates) {
        const newItem = {
          id: nextId.dispatch_assignments++,
          assignment_id,
          date,
          worker_id,
          vehicle_ids: vehicle_ids || [],
          device_ids: device_ids || [],
          notes: notes || '',
          created_at: new Date().toISOString().split('T')[0]
        };
        mockDB.dispatch_assignments.push(newItem);
        created.push(newItem);
      }
      
      saveData('dispatch_assignments', { items: mockDB.dispatch_assignments, nextId: nextId.dispatch_assignments });
      
      console.log(`[API] Created ${created.length} dispatch_assignments (bulk)`);
      sendJSONResponse(res, 200, {
        success: true,
        count: created.length,
        data: created
      });
      return;
    }
    
    // POST /backend/api/time_entries/confirm_day
    if (pathParts.length >= 2 && pathParts[0] === 'time_entries' && pathParts[1] === 'confirm_day' && req.method === 'POST') {
      const date = requestData.date;
      if (!date) {
        sendJSONResponse(res, 400, {
          success: false,
          error: 'Date is required'
        });
        return;
      }
      
      // Mark all time entries for that date as confirmed
      mockDB.time_entries.forEach(entry => {
        if (entry.date === date) {
          entry.status = 'CONFIRMED';
        }
      });
      saveData('time_entries', { items: mockDB.time_entries, nextId: nextId.time_entries });
      
      sendJSONResponse(res, 200, {
        success: true,
        message: `Day ${date} confirmed`,
        date: date
      });
      return;
    }
    
    // POST /backend/api/dispatch_items/confirm_day
    if (pathParts.length >= 2 && pathParts[0] === 'dispatch_items' && pathParts[1] === 'confirm_day' && req.method === 'POST') {
      const date = requestData.date;
      const workerId = requestData.worker_id;
      
      if (!date) {
        sendJSONResponse(res, 400, {
          success: false,
          error: 'Date is required'
        });
        return;
      }
      
      // Mark dispatch items for that date as confirmed
      mockDB.dispatch_items.forEach(item => {
        if (item.date === date && (!workerId || item.worker_id === workerId)) {
          item.status = 'CONFIRMED';
        }
      });
      saveData('dispatch_items', { items: mockDB.dispatch_items, nextId: nextId.dispatch_items });
      
      sendJSONResponse(res, 200, {
        success: true,
        message: `Dispatch day ${date} confirmed`
      });
      return;
    }
    
    // GET /backend/api/admin/overview/week
    if (pathParts.length >= 3 && pathParts[0] === 'admin' && pathParts[1] === 'overview' && pathParts[2] === 'week' && req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const week = url.searchParams.get('week') || '4';
      const year = url.searchParams.get('year') || '2026';
      const workerId = url.searchParams.get('worker_id');
      
      let entries = [...mockDB.week_planning];
      let timeEntries = [...mockDB.time_entries];
      
      // Filter by worker if specified
      if (workerId) {
        entries = entries.filter(e => e.worker_id == workerId);
        timeEntries = timeEntries.filter(e => e.worker_id == workerId);
      }
      
      sendJSONResponse(res, 200, {
        success: true,
        data: {
          week: parseInt(week),
          year: parseInt(year),
          planning_entries: entries,
          time_entries: timeEntries,
          summary: {
            total_entries: entries.length,
            total_hours: entries.reduce((sum, e) => sum + (e.hours || 0), 0)
          }
        }
      });
      return;
    }
    
    // Handle CRUD operations for resources
    const table = resource;
    if (['users', 'workers', 'teams', 'locations', 'assignments', 'week_planning', 'time_entries', 'medical_certificates', 'vehicles', 'devices', 'dispatch_items', 'dispatch_assignments', 'todos'].includes(table)) {
      if (req.method === 'GET') {
        // GET all or GET by ID
        if (id) {
          const item = mockDB[table].find(item => item.id === id);
          if (item) {
            sendJSONResponse(res, 200, {
              success: true,
              data: normalizeData(item, table.slice(0, -1)) // Remove 's' from plural
            });
          } else {
            sendJSONResponse(res, 404, {
              success: false,
              error: 'Not found'
            });
          }
        } else {
          // GET all with query params
          let items = [...mockDB[table]];
          
          // Apply filters if needed
          const url = new URL(req.url, `http://${req.headers.host}`);
          const workerId = url.searchParams.get('worker_id');
          const assignmentId = url.searchParams.get('assignment_id');
          const dateFrom = url.searchParams.get('date_from');
          const dateTo = url.searchParams.get('date_to');
          
          if (workerId && table === 'workers') {
            items = items.filter(item => item.id === parseInt(workerId));
          }
          
          // Filter dispatch_assignments by query params
          if (table === 'dispatch_assignments') {
            if (workerId) {
              items = items.filter(item => item.worker_id === parseInt(workerId));
            }
            if (assignmentId) {
              items = items.filter(item => item.assignment_id === parseInt(assignmentId));
            }
            if (dateFrom) {
              items = items.filter(item => item.date >= dateFrom);
            }
            if (dateTo) {
              items = items.filter(item => item.date <= dateTo);
            }
          }
          
          sendJSONResponse(res, 200, {
            success: true,
            data: items.map(item => normalizeData(item, table.slice(0, -1)))
          });
        }
        return;
      } else if (req.method === 'POST') {
        // CREATE
        const newItem = {
          id: nextId[table]++,
          ...requestData,
          created_at: new Date().toISOString().split('T')[0]
        };
        
        // Handle special fields
        if (table === 'users' && newItem.permissions && Array.isArray(newItem.permissions)) {
          newItem.permissions = JSON.stringify(newItem.permissions);
        }
        if (table === 'workers' && newItem.availability && Array.isArray(newItem.availability)) {
          newItem.availability = JSON.stringify(newItem.availability);
        }
        if (table === 'teams' && newItem.members && Array.isArray(newItem.members)) {
          newItem.members = JSON.stringify(newItem.members);
        }
        if (table === 'workers' && newItem.contact) {
          newItem.contact_phone = newItem.contact.phone;
          newItem.contact_email = newItem.contact.email;
          delete newItem.contact;
        }
        if (table === 'teams' && newItem.contact) {
          newItem.contact_phone = newItem.contact.phone;
          newItem.contact_email = newItem.contact.email;
          newItem.contact_address = newItem.contact.address;
          delete newItem.contact;
        }
        if (table === 'teams' && newItem.isActive !== undefined) {
          newItem.is_active = newItem.isActive;
          delete newItem.isActive;
        }
        
        mockDB[table].push(newItem);
        saveData(table, { items: mockDB[table], nextId: nextId[table] });
        sendJSONResponse(res, 200, {
          success: true,
          id: newItem.id,
          data: normalizeData(newItem, table.slice(0, -1))
        });
        return;
      } else if (req.method === 'PUT') {
        // UPDATE
        const index = mockDB[table].findIndex(item => item.id === id);
        if (index !== -1) {
          const updatedItem = {
            ...mockDB[table][index],
            ...requestData,
            id: id // Ensure ID doesn't change
          };
          
          // Handle special fields
          if (table === 'users' && updatedItem.permissions && Array.isArray(updatedItem.permissions)) {
            updatedItem.permissions = JSON.stringify(updatedItem.permissions);
          }
          if (table === 'workers' && updatedItem.availability && Array.isArray(updatedItem.availability)) {
            updatedItem.availability = JSON.stringify(updatedItem.availability);
          }
          if (table === 'teams' && updatedItem.members && Array.isArray(updatedItem.members)) {
            updatedItem.members = JSON.stringify(updatedItem.members);
          }
          if (table === 'workers' && updatedItem.contact) {
            updatedItem.contact_phone = updatedItem.contact.phone;
            updatedItem.contact_email = updatedItem.contact.email;
            delete updatedItem.contact;
          }
          if (table === 'teams' && updatedItem.contact) {
            updatedItem.contact_phone = updatedItem.contact.phone;
            updatedItem.contact_email = updatedItem.contact.email;
            updatedItem.contact_address = updatedItem.contact.address;
            delete updatedItem.contact;
          }
          if (table === 'teams' && updatedItem.isActive !== undefined) {
            updatedItem.is_active = updatedItem.isActive;
            delete updatedItem.isActive;
          }
          
          mockDB[table][index] = updatedItem;
          saveData(table, { items: mockDB[table], nextId: nextId[table] });
          sendJSONResponse(res, 200, {
            success: true,
            data: normalizeData(updatedItem, table.slice(0, -1))
          });
        } else {
          sendJSONResponse(res, 404, {
            success: false,
            error: 'Not found'
          });
        }
        return;
      } else if (req.method === 'DELETE') {
        // DELETE
        const index = mockDB[table].findIndex(item => item.id === id);
        if (index !== -1) {
          mockDB[table].splice(index, 1);
          saveData(table, { items: mockDB[table], nextId: nextId[table] });
          sendJSONResponse(res, 200, {
            success: true,
            message: 'Deleted'
          });
        } else{
          sendJSONResponse(res, 404, {
            success: false,
            error: 'Not found'
          });
        }
        return;
      }
    }
    
    // Handle special endpoints with sub-paths
    // POST /backend/api/time_entries/confirm_day
    if (pathParts[0] === 'time_entries' && pathParts[1] === 'confirm_day' && req.method === 'POST') {
      const date = requestData.date;
      if (!date) {
        sendJSONResponse(res, 400, {
          success: false,
          error: 'Date is required'
        });
        return;
      }
      
      // Mark all time entries for that date as confirmed
      mockDB.time_entries.forEach(entry => {
        if (entry.date === date) {
          entry.status = 'CONFIRMED';
        }
      });
      saveData('time_entries', { items: mockDB.time_entries, nextId: nextId.time_entries });
      
      sendJSONResponse(res, 200, {
        success: true,
        message: `Day ${date} confirmed`,
        date: date
      });
      return;
    }
    
    // POST /backend/api/dispatch_items/confirm_day
    if (pathParts[0] === 'dispatch_items' && pathParts[1] === 'confirm_day' && req.method === 'POST') {
      const date = requestData.date;
      const workerId = requestData.worker_id;
      
      if (!date) {
        sendJSONResponse(res, 400, {
          success: false,
          error: 'Date is required'
        });
        return;
      }
      
      // Mark dispatch items for that date as confirmed
      mockDB.dispatch_items.forEach(item => {
        if (item.date === date && (!workerId || item.worker_id === workerId)) {
          item.status = 'CONFIRMED';
        }
      });
      saveData('dispatch_items', { items: mockDB.dispatch_items, nextId: nextId.dispatch_items });
      
      sendJSONResponse(res, 200, {
        success: true,
        message: `Dispatch day ${date} confirmed`
      });
      return;
    }
    
    // GET /backend/api/admin/overview/week
    if (pathParts[0] === 'admin' && pathParts[1] === 'overview' && pathParts[2] === 'week' && req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const week = url.searchParams.get('week') || '4';
      const year = url.searchParams.get('year') || '2026';
      const workerId = url.searchParams.get('worker_id');
      
      let entries = [...mockDB.week_planning];
      let timeEntries = [...mockDB.time_entries];
      
      // Filter by worker if specified
      if (workerId) {
        entries = entries.filter(e => e.worker_id == workerId);
        timeEntries = timeEntries.filter(e => e.worker_id == workerId);
      }
      
      sendJSONResponse(res, 200, {
        success: true,
        data: {
          week: parseInt(week),
          year: parseInt(year),
          planning_entries: entries,
          time_entries: timeEntries,
          summary: {
            total_entries: entries.length,
            total_hours: entries.reduce((sum, e) => sum + (e.hours || 0), 0)
          }
        }
      });
      return;
    }
    
    // Handle dashboard
    if (resource === 'dashboard' && req.method === 'GET') {
      sendJSONResponse(res, 200, {
        success: true,
        data: {
          workers: mockDB.workers.length,
          teams: mockDB.teams.filter(t => t.is_active).length,
          locations: mockDB.locations.length,
          assignments_today: mockDB.assignments.length
        }
      });
      return;
    }
    
    // Default: endpoint not found
    sendJSONResponse(res, 404, {
      success: false,
      error: 'Endpoint not found',
      resource: resource,
      method: req.method,
      path: urlPath
    });
  });
}

function sendJSONResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  // Error handler
  const handleError = (err) => {
    console.error('Server Error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: ' + err.message);
    }
  };

  try {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Parse URL first
    let urlPath;
    try {
      const host = req.headers.host || 'localhost:8080';
      urlPath = new URL(req.url, `http://${host}`).pathname;
    } catch (e) {
      // Fallback if URL parsing fails
      urlPath = req.url.split('?')[0];
    }

    // Default to index.html for root path
    if (urlPath === '/' || urlPath === '') {
      urlPath = '/index.html';
    }

    // Map static files to frontend directory
    let filePath;
    if (urlPath.startsWith('/backend/')) {
      filePath = '.' + urlPath; // Backend files stay in backend/
    } else {
      // All other files come from frontend/
      filePath = './frontend/public' + urlPath;
      // Check if file exists in public, otherwise try src/
      if (!fs.existsSync(filePath)) {
        filePath = './frontend' + urlPath;
      }
    }

  // Route all /backend/api/* requests to Node.js API
  if (urlPath.startsWith('/backend/api')) {
    handleAPI(urlPath, req, res);
    return;
  }

    // Serve static files
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found');
        } else {
          console.error('File read error:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Server error: ' + err.code);
        }
      } else {
        res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
        res.end(content, 'utf-8');
      }
    });
  } catch (err) {
    handleError(err);
  }
}).on('error', (err) => {
  console.error('Request error:', err);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server läuft auf http://localhost:${PORT}`);
  console.log(`✓ Server erreichbar auf http://127.0.0.1:${PORT}`);
  console.log(`✓ Node.js API ready - PHP nicht erforderlich`);
});

