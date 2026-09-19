import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const rules = [
  {
    directory: 'src/domain',
    forbidden:
      /from ['"](?:@\/(?:application|infrastructure|presentation|config)|next|react|viem|wagmi|drizzle-orm|ai)['"]/,
  },
  {
    directory: 'src/application',
    forbidden: /from ['"]@\/(?:infrastructure|presentation|config)['"]/,
  },
];
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)],
      ),
    )
  ).flat();
}
const violations = [];
for (const rule of rules)
  for (const file of await files(rule.directory))
    if (rule.forbidden.test(await readFile(file, 'utf8'))) violations.push(file);
if (violations.length) {
  console.error(`Boundary violations:\n${violations.join('\n')}`);
  process.exitCode = 1;
} else console.log('Architecture boundaries verified.');
