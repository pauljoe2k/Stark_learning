import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let stopping = false;

function startWorkspace(name, workspace, script = 'dev') {
  const child = spawn(npm, ['run', script, '--workspace', workspace], {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  children.push(child);
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${name} exited with code ${code ?? 'unknown'}.`);
      stop(code ?? 1);
    }
  });
  return child;
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
  process.exitCode = code;
}

async function waitFor(url, label, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no response';
  while (Date.now() < deadline && !stopping) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`${label} did not become ready: ${lastError}`);
}

process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));

startWorkspace('api', '@pinpoint/api');
startWorkspace('worker', '@pinpoint/api', 'worker');
startWorkspace('web', '@pinpoint/web');

try {
  await Promise.all([
    waitFor('http://localhost:4100/health', 'API'),
    waitFor('http://localhost:5180', 'web app'),
  ]);
  console.info('Pinpoint API and web app are ready at http://localhost:4100 and http://localhost:5180.');
  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/c', 'start', '', 'http://localhost:5180'], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', ['http://localhost:5180'], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', ['http://localhost:5180'], { detached: true, stdio: 'ignore' }).unref();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  stop(1);
}
