import { spawn } from 'node:child_process';

const processes = [];
let shuttingDown = false;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 100).unref();
}

function start(name, args) {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env: process.env
  });
  processes.push(child);
  child.on('error', (error) => {
    console.error(`[${name}] falha ao iniciar: ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (!shuttingDown && (code !== 0 || signal)) shutdown(code ?? 1);
  });
}

start('web', ['run', 'dev', '--workspace=@trotebox/web']);
start('api', ['run', 'dev', '--workspace=@trotebox/api']);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}
