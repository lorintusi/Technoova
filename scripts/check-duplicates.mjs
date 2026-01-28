#!/usr/bin/env node
/**
 * Check for duplicate exports in state files
 * Prevents SyntaxError from duplicate function/const declarations
 * 
 * Usage: node scripts/check-duplicates.mjs
 * Exit code: 0 if no duplicates, 1 if duplicates found
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Extract all named exports from a file
 * @param {string} filePath - Path to file
 * @returns {Array<{name: string, line: number, type: string}>} Array of exports
 */
function extractExports(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const exports = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Match: export function X
      const funcMatch = line.match(/export\s+function\s+(\w+)/);
      if (funcMatch) {
        exports.push({ name: funcMatch[1], line: lineNum, type: 'function' });
      }
      
      // Match: export const X
      const constMatch = line.match(/export\s+const\s+(\w+)/);
      if (constMatch) {
        exports.push({ name: constMatch[1], line: lineNum, type: 'const' });
      }
      
      // Match: export { X, Y }
      const namedMatch = line.match(/export\s*\{\s*([^}]+)\s*\}/);
      if (namedMatch) {
        const names = namedMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
        names.forEach(name => {
          if (name) {
            exports.push({ name, line: lineNum, type: 'named' });
          }
        });
      }
    }
    
    return exports;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Check for duplicates in a file
 * @param {string} filePath - Path to file
 * @returns {Array<{name: string, lines: number[]}>} Array of duplicates
 */
function checkDuplicates(filePath) {
  const exports = extractExports(filePath);
  const nameMap = new Map();
  
  // Group by name
  exports.forEach(exp => {
    if (!nameMap.has(exp.name)) {
      nameMap.set(exp.name, []);
    }
    nameMap.get(exp.name).push(exp.line);
  });
  
  // Find duplicates
  const duplicates = [];
  nameMap.forEach((lines, name) => {
    if (lines.length > 1) {
      duplicates.push({ name, lines });
    }
  });
  
  return duplicates;
}

/**
 * Main check function
 */
function main() {
  const filesToCheck = [
    join(projectRoot, 'app', 'state', 'selectors.js'),
    join(projectRoot, 'app', 'state', 'actions.js')
  ];
  
  let hasDuplicates = false;
  
  filesToCheck.forEach(filePath => {
    const duplicates = checkDuplicates(filePath);
    
    if (duplicates.length > 0) {
      hasDuplicates = true;
      const relativePath = filePath.replace(projectRoot + '/', '');
      console.error(`\n❌ Duplicate exports found in ${relativePath}:`);
      
      duplicates.forEach(dup => {
        console.error(`   "${dup.name}" exported multiple times at lines: ${dup.lines.join(', ')}`);
      });
    }
  });
  
  if (hasDuplicates) {
    console.error('\n💡 Fix: Remove duplicate exports. Each export should be declared only once.');
    process.exit(1);
  } else {
    console.log('✅ No duplicate exports found');
    process.exit(0);
  }
}

main();



