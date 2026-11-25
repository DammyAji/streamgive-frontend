// Fails when a route's first load JavaScript is over the budget.
// Run after `next build`. Budget lives in bundle-budget.json (kB).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const statsPath = '.next/diagnostics/route-bundle-stats.json';
const budget = JSON.parse(readFileSync('bundle-budget.json', 'utf8'));

if (!existsSync(statsPath)) {
  console.error(`Missing ${statsPath}. Run "npm run build" first.`);
  process.exit(1);
}

const routes = JSON.parse(readFileSync(statsPath, 'utf8'));
const sizes = {};
const failures = [];

for (const entry of routes) {
  const kb = Math.round((entry.firstLoadUncompressedJsBytes / 1024) * 10) / 10;
  const limit = budget.routes?.[entry.route] ?? budget.maxFirstLoadKb;
  sizes[entry.route] = kb;
  console.log(`${entry.route}: ${kb} kB (budget ${limit} kB)`);
  if (kb > limit) failures.push(`${entry.route} is ${kb} kB, over ${limit} kB`);
}

writeFileSync('.next/bundle-sizes.json', JSON.stringify(sizes, null, 2));

if (failures.length > 0) {
  console.error(`\nBundle size budget exceeded:\n${failures.join('\n')}`);
  process.exit(1);
}
