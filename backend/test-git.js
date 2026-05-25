const { execSync } = require('child_process');

try {
  const status = execSync('git status', { encoding: 'utf8' });
  console.log('--- GIT STATUS ---');
  console.log(status);

  const diff = execSync('git diff --stat', { encoding: 'utf8' });
  console.log('--- GIT DIFF STAT ---');
  console.log(diff || 'No local changes');
} catch (err) {
  console.error('Error running git commands:', err.message);
}
