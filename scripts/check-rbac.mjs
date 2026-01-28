#!/usr/bin/env node
/**
 * RBAC Check Script
 * Verifies that permission checks are present in critical API endpoints and UI components
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const API_DIR = 'backend/api';
const HANDLERS_DIR = 'app/handlers';
const VIEWS_DIR = 'app/views';

// Critical endpoints that should have permission checks
const CRITICAL_ENDPOINTS = [
  'users.php',
  'workers.php',
  'teams.php',
  'locations.php',
  'vehicles.php',
  'devices.php',
  'dispatch_items.php',
  'todos.php'
];

// Permission check patterns
const PERMISSION_PATTERNS = [
  /hasPermission\s*\(/,
  /canManageUsers\s*\(/,
  /canPlanFor\s*\(/,
  /canConfirmDay\s*\(/,
  /role\s*===\s*['"]Admin['"]/,
  /permissions.*includes/
];

// UI components that should check permissions
const CRITICAL_UI_COMPONENTS = [
  'managementShell.js',
  'planningShell.js',
  'userModal.js',
  'vehicleModal.js',
  'deviceModal.js',
  'dispatchItemModal.js',
  'todoModal.js'
];

let errors = [];
let warnings = [];

/**
 * Check if file contains permission checks
 */
function checkFile(filePath, fileName) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const hasPermissionCheck = PERMISSION_PATTERNS.some(pattern => pattern.test(content));
    
    if (!hasPermissionCheck) {
      if (fileName.includes('.php')) {
        errors.push(`❌ ${filePath}: Missing permission check in API endpoint`);
      } else {
        warnings.push(`⚠️  ${filePath}: Consider adding permission check`);
      }
    } else {
      console.log(`✅ ${filePath}: Permission checks found`);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath, fileList);
    } else if (stat.isFile() && (extname(file) === '.php' || extname(file) === '.js')) {
      fileList.push({ path: filePath, name: file });
    }
  }
  
  return fileList;
}

/**
 * Main check function
 */
function main() {
  console.log('🔍 Checking RBAC (Role-Based Access Control)...\n');
  
  // Check API endpoints
  console.log('📡 Checking API endpoints...');
  const apiFiles = scanDirectory(API_DIR);
  for (const file of apiFiles) {
    if (CRITICAL_ENDPOINTS.includes(file.name)) {
      checkFile(file.path, file.name);
    }
  }
  
  // Check handlers
  console.log('\n🎯 Checking handlers...');
  const handlerFiles = scanDirectory(HANDLERS_DIR);
  for (const file of handlerFiles) {
    if (file.name.includes('Handler') || file.name.includes('handler')) {
      checkFile(file.path, file.name);
    }
  }
  
  // Check critical UI components
  console.log('\n🎨 Checking UI components...');
  const viewFiles = scanDirectory(VIEWS_DIR);
  for (const file of viewFiles) {
    if (CRITICAL_UI_COMPONENTS.some(comp => file.name.includes(comp))) {
      checkFile(file.path, file.name);
    }
  }
  
  // Report results
  console.log('\n' + '='.repeat(60));
  console.log('📊 RBAC Check Results\n');
  
  if (errors.length > 0) {
    console.log('❌ ERRORS (must fix):');
    errors.forEach(err => console.log(`  ${err}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS (consider fixing):');
    warnings.forEach(warn => console.log(`  ${warn}`));
    console.log('');
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed!');
  }
  
  // Exit with error code if there are critical errors
  process.exit(errors.length > 0 ? 1 : 0);
}

main();



