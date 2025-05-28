#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting Next.js application...');

const nextProcess = spawn('npx', ['next', 'dev', '--hostname', '0.0.0.0', '--port', '3000'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

nextProcess.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

nextProcess.on('close', (code) => {
  process.exit(code || 0);
});

process.on('SIGTERM', () => nextProcess.kill());
process.on('SIGINT', () => nextProcess.kill());