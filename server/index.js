import { spawn } from 'child_process';

console.log('Starting Next.js development server...');

const server = spawn('node', ['./node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', '--port', '3000'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  server.kill();
});

process.on('SIGINT', () => {
  server.kill();
});