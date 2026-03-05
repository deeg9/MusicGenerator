import { execSync } from 'child_process';

try {
  const out = execSync('npx drizzle-kit push', {
    input: 'y\n',
    timeout: 30000,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const lines = out.split('\n').filter(l => {
    if (l.includes('Pulling schema')) return false;
    if (l.includes('\u28b7') || l.includes('\u28ef')) return false;
    return true;
  });
  console.log(lines.join('\n').slice(-2000));
} catch(e) {
  const out = (e.stdout || '') + '\n' + (e.stderr || '');
  const lines = out.split('\n').filter(l => {
    if (l.includes('Pulling schema')) return false;
    return true;
  });
  console.log(lines.join('\n').slice(-2000));
}
