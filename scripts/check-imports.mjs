#!/usr/bin/env node
/**
 * Check for direct imports of state files (should use index.js instead)
 * 
 * Usage: node scripts/check-imports.mjs
 * Exit code: 0 if all imports use index.js, 1 if direct imports found
 */

import { readFileSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Recursively find all JS files in a directory
 */
function findJsFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other common dirs
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        findJsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Check file for direct state imports
 */
function checkFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const violations = [];
    
    // Patterns to match direct imports
    const patterns = [
      /from\s+['"].*state\/store\.js['"]/,
      /from\s+['"].*state\/actions\.js['"]/,
      /from\s+['"].*state\/selectors\.js['"]/
    ];
    
    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        if (pattern.test(line) && !line.includes('// ALLOWED')) {
          // Exclude legacyBridge.js and state files themselves
          if (!filePath.includes('legacyBridge.js') && 
              !filePath.includes('state/store.js') && 
              !filePath.includes('state/actions.js') && 
              !filePath.includes('state/selectors.js')) {
            violations.push({
              line: index + 1,
              content: line.trim()
            });
          }
        }
      });
    });
    
    return violations;
  } catch (error) {
    return [];
  }
}

/**
 * Main check function
 */
function main() {
  const appDir = join(projectRoot, 'app');
  const files = findJsFiles(appDir);
  
  const violations = [];
  
  files.forEach(filePath => {
    const fileViolations = checkFile(filePath);
    if (fileViolations.length > 0) {
      violations.push({
        file: filePath.replace(projectRoot + '/', ''),
        violations: fileViolations
      });
    }
  });
  
  if (violations.length > 0) {
    console.error('\n⚠️  Direct state imports found (should use state/index.js):\n');
    
    violations.forEach(({ file, violations: fileViolations }) => {
      console.error(`  ${file}:`);
      fileViolations.forEach(v => {
        console.error(`    Line ${v.line}: ${v.content}`);
      });
      console.error('');
    });
    
    console.error('💡 Fix: Change imports to use "../state/index.js" (or relative path)');
    console.error('   Example: import { getState } from "../state/index.js";');
    process.exit(1);
  } else {
    console.log('✅ All state imports use index.js');
    process.exit(0);
  }
}

main();



