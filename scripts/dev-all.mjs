import { spawn } from 'node:child_process';

const processes = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 100).unref();
}

function start(name, args) {
  const child = spawn('npm', args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env
  });
  processes.push(child);
  child.on('error', (error) => {
    console.error(`[${name}] falha ao iniciar: ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code) => {
    if (!shuttingDown && code && code !== 0) shutdown(code);
  });
}

start('web', ['run', 'dev', '--workspace=@trotebox/web']);
start('api', ['run', 'dev', '--workspace=@trotebox/api']);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}
