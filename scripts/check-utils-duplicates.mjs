#!/usr/bin/env node
/**
 * Check for duplicate exports in utils files
 * Prevents SyntaxError from duplicate function/const declarations
 * 
 * Usage: node scripts/check-utils-duplicates.mjs
 * Exit code: 0 if no duplicates, 1 if duplicates found
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const utilsDir = join(projectRoot, 'app', 'utils');

/**
 * Extract all named exports from a file
 * @param {string} filePath - Path to file
 * @returns {Array<{name: string, line: number, type: string, file: string}>} Array of exports
 */
function extractExports(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const exports = [];
    const fileName = filePath.split(/[/\\]/).pop();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Match: export function X
      const funcMatch = line.match(/export\s+function\s+(\w+)/);
      if (funcMatch) {
        exports.push({ name: funcMatch[1], line: lineNum, type: 'function', file: fileName });
      }
      
      // Match: export const X
      const constMatch = line.match(/export\s+const\s+(\w+)/);
      if (constMatch) {
        exports.push({ name: constMatch[1], line: lineNum, type: 'const', file: fileName });
      }
      
      // Match: export { X, Y }
      const namedMatch = line.match(/export\s*\{\s*([^}]+)\s*\}/);
      if (namedMatch) {
        const names = namedMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
        names.forEach(name => {
          if (name) {
            exports.push({ name, line: lineNum, type: 'named', file: fileName });
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
 * Get all JS files in utils directory
 */
function getUtilsFiles() {
  const files = [];
  
  function scanDir(dir) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (stat.isFile() && extname(entry) === '.js') {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning ${dir}:`, error.message);
    }
  }
  
  scanDir(utilsDir);
  return files;
}

/**
 * Main check function
 */
function main() {
  const files = getUtilsFiles();
  const allExports = new Map(); // name -> [{file, line, type}]
  
  // Collect all exports
  files.forEach(filePath => {
    const exports = extractExports(filePath);
    exports.forEach(exp => {
      if (!allExports.has(exp.name)) {
        allExports.set(exp.name, []);
      }
      allExports.get(exp.name).push({
        file: exp.file,
        line: exp.line,
        type: exp.type,
        path: filePath.replace(projectRoot + '/', '')
      });
    });
  });
  
  // Find duplicates (same name in different files)
  const duplicates = [];
  allExports.forEach((locations, name) => {
    if (locations.length > 1) {
      // Check if in different files
      const uniqueFiles = new Set(locations.map(l => l.file));
      if (uniqueFiles.size > 1) {
        duplicates.push({ name, locations });
      }
    }
  });
  
  if (duplicates.length > 0) {
    console.error('\n❌ Duplicate exports found in utils:');
    duplicates.forEach(dup => {
      console.error(`\n   "${dup.name}" exported in multiple files:`);
      dup.locations.forEach(loc => {
        console.error(`      - ${loc.path}:${loc.line} (${loc.type})`);
      });
    });
    console.error('\n💡 Fix: Each export should exist in only ONE file. Use imports instead of duplicates.');
    process.exit(1);
  } else {
    console.log('✅ No duplicate exports found in utils');
    process.exit(0);
  }
}

main();



