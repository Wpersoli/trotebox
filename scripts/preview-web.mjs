import { spawn } from 'node:child_process';

console.log('\nPreview visual TroteBox');
console.log('Abra: http://127.0.0.1:3000');
console.log('Mantenha este terminal aberto enquanto estiver navegando.\n');

const child = spawn('npm', ['run', 'dev', '--workspace=@trotebox/web'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    NEXT_PUBLIC_PREVIEW_MODE: 'true',
    NEXT_PUBLIC_AUTH_MODE: 'dev',
    NEXT_PUBLIC_APP_NAME: 'TroteBox',
    NEXT_PUBLIC_COMMERCE_MODE: 'web',
    NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3001/api/v1'
  }
});

child.on('error', (error) => {
  console.error(`Não foi possível iniciar o preview: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
