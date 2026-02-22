#!/usr/bin/env node

/**
 * Universal Playwright Script Executor
 * 
 * Ensures proper module resolution for Playwright scripts
 * Usage: node run.js <script-path> [args...]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get script path from arguments
const scriptPath = process.argv[2];

if (!scriptPath) {
  console.error('Usage: node run.js <script-path>');
  process.exit(1);
}

// Resolve script path
const resolvedPath = path.resolve(scriptPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: Script not found: ${resolvedPath}`);
  process.exit(1);
}

console.log(`Executing: ${resolvedPath}\n`);

// Execute script with proper module resolution
const child = spawn('node', [resolvedPath, ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_PATH: path.join(__dirname, '../../../node_modules') + path.delimiter + 
               path.join(process.cwd(), 'node_modules')
  }
});

child.on('error', (error) => {
  console.error('Execution error:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
