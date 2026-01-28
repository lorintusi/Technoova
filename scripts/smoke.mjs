#!/usr/bin/env node
/**
 * Smoke Test for Technoova Planner API
 * Tests critical endpoints to ensure backend is functional
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/backend/api`;

let testsPassed = 0;
let testsFailed = 0;

function log(message, type = 'info') {
  const prefix = {
    info: '[INFO]',
    success: '[PASS]',
    error: '[FAIL]',
    warn: '[WARN]'
  }[type] || '[INFO]';
  
  console.log(`${prefix} ${message}`);
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}/${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, mergedOptions);
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Non-JSON response: ${text.substring(0, 100)}`);
    }
    
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

async function test(name, fn) {
  try {
    log(`Testing: ${name}`, 'info');
    await fn();
    log(`✓ ${name}`, 'success');
    testsPassed++;
  } catch (error) {
    log(`✗ ${name}: ${error.message}`, 'error');
    testsFailed++;
  }
}

async function runTests() {
  log('Starting smoke tests...', 'info');
  log('', 'info');
  
  // Test 1: API Health Check
  await test('GET /test - API health check', async () => {
    const { ok, data } = await request('test');
    if (!ok) throw new Error('API health check failed');
    if (data.mode !== 'NODE_API') throw new Error('Expected NODE_API mode');
  });
  
  // Test 2: Login
  let loginUser = null;
  await test('POST /auth - Login with admin credentials', async () => {
    const { ok, data } = await request('auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', username: 'admin', password: '010203' })
    });
    if (!ok) throw new Error('Login failed');
    if (!data.user) throw new Error('No user in response');
    if (data.user.username !== 'admin') throw new Error('Wrong user returned');
    loginUser = data.user;
  });
  
  // Test 3: Get current user
  await test('GET /me - Get current user', async () => {
    const { ok, data } = await request('me');
    if (!ok) throw new Error('Get current user failed');
    if (!data.user) throw new Error('No user in response');
  });
  
  // Test 4: Get todos (empty initially)
  await test('GET /todos - Get todos list', async () => {
    const { ok, data } = await request('todos');
    if (!ok) throw new Error('Get todos failed');
    if (!Array.isArray(data.data)) throw new Error('Expected array of todos');
  });
  
  // Test 5: Create a todo
  let createdTodoId = null;
  await test('POST /todos - Create a new todo', async () => {
    const { ok, data } = await request('todos', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Smoke Test Todo',
        description: 'Created by automated smoke test',
        status: 'pending',
        assigned_to: 1,
        due_date: '2026-01-30'
      })
    });
    if (!ok) throw new Error('Create todo failed');
    if (!data.id) throw new Error('No ID returned for created todo');
    if (!data.data) throw new Error('No data returned for created todo');
    createdTodoId = data.id;
  });
  
  // Test 6: Get todos again and verify creation
  await test('GET /todos - Verify todo was created', async () => {
    const { ok, data } = await request('todos');
    if (!ok) throw new Error('Get todos failed');
    if (!Array.isArray(data.data)) throw new Error('Expected array of todos');
    const found = data.data.find(t => t.id === createdTodoId);
    if (!found) throw new Error(`Created todo (id=${createdTodoId}) not found in list`);
    if (found.title !== 'Smoke Test Todo') throw new Error('Todo title mismatch');
  });
  
  // Test 7: Update the todo
  await test('PUT /todos/{id} - Update todo', async () => {
    const { ok, data } = await request(`todos/${createdTodoId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'completed'
      })
    });
    if (!ok) throw new Error('Update todo failed');
    if (data.data.status !== 'completed') throw new Error('Todo status not updated');
  });
  
  // Test 8: Delete the todo
  await test('DELETE /todos/{id} - Delete todo', async () => {
    const { ok } = await request(`todos/${createdTodoId}`, {
      method: 'DELETE'
    });
    if (!ok) throw new Error('Delete todo failed');
  });
  
  // Test 9: Verify deletion
  await test('GET /todos - Verify todo was deleted', async () => {
    const { ok, data } = await request('todos');
    if (!ok) throw new Error('Get todos failed');
    const found = data.data.find(t => t.id === createdTodoId);
    if (found) throw new Error(`Deleted todo (id=${createdTodoId}) still exists`);
  });
  
  // Test 10: Confirm day endpoint
  await test('POST /time_entries/confirm_day - Confirm a day', async () => {
    const { ok, data } = await request('time_entries/confirm_day', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-01-23' })
    });
    if (!ok) throw new Error('Confirm day failed');
    if (!data.message) throw new Error('No confirmation message');
  });
  
  // Test 11: Admin overview endpoint
  await test('GET /admin/overview/week - Get admin overview', async () => {
    const { ok, data } = await request('admin/overview/week?week=4&year=2026');
    if (!ok) throw new Error('Admin overview failed');
    if (!data.data) throw new Error('No data in admin overview');
    if (data.data.week !== 4) throw new Error('Week mismatch in response');
  });
  
  // Test 12: Get workers
  await test('GET /workers - Get workers list', async () => {
    const { ok, data } = await request('workers');
    if (!ok) throw new Error('Get workers failed');
    if (!Array.isArray(data.data)) throw new Error('Expected array of workers');
    if (data.data.length < 4) throw new Error('Expected at least 4 default workers');
  });
  
  // Test 13: Get teams
  await test('GET /teams - Get teams list', async () => {
    const { ok, data } = await request('teams');
    if (!ok) throw new Error('Get teams failed');
    if (!Array.isArray(data.data)) throw new Error('Expected array of teams');
    if (data.data.length < 2) throw new Error('Expected at least 2 default teams');
  });
  
  // Test 14: Get locations
  await test('GET /locations - Get locations list', async () => {
    const { ok, data } = await request('locations');
    if (!ok) throw new Error('Get locations failed');
    if (!Array.isArray(data.data)) throw new Error('Expected array of locations');
    if (data.data.length < 2) throw new Error('Expected at least 2 default locations');
  });
  
  // Test 15: Get vehicles
  await test('GET /vehicles - Get vehicles list', async () => {
    const { ok, data } = await request('vehicles');
    if (!ok) throw new Error('Get vehicles failed');
    if (!Array.isArray(data.data)) throw new Error('Expected array of vehicles');
  });
  
  // Test 16: Get devices
  await test('GET /devices - Get devices list', async () => {
    const { ok, data } = await request('devices');
    if (!ok) throw new Error('Get devices failed');
    if (!Array.isArray(data.data)) throw new Error('Expected array of devices');
  });
  
  // Test 17: Get dispatch items
  await test('GET /dispatch_items - Get dispatch items list', async () => {
    const { ok, data } = await request('dispatch_items');
    if (!ok) throw new Error('Get dispatch items failed');
    if (!Array.isArray(data.data)) throw new Error('Expected array of dispatch items');
  });
  
  // Test 18: Get medical certificates
  await test('GET /medical_certificates - Get medical certificates list', async () => {
    const { ok, data } = await request('medical_certificates');
    if (!ok) throw new Error('Get medical certificates failed');
    if (!Array.isArray(data.data)) throw new Error('Expected array of medical certificates');
  });
  
  log('', 'info');
  log('='.repeat(50), 'info');
  log(`Tests passed: ${testsPassed}`, testsPassed > 0 ? 'success' : 'info');
  log(`Tests failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'info');
  log('='.repeat(50), 'info');
  
  if (testsFailed > 0) {
    process.exit(1);
  } else {
    log('All smoke tests passed!', 'success');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});

