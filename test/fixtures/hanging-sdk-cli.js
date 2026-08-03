import { writeFileSync } from 'node:fs';

const pidPath = process.argv[2];
if (!pidPath) {
  throw new Error('The hanging SDK CLI fixture requires a pid-file path.');
}

writeFileSync(pidPath, `${process.pid}\n`);
setInterval(() => {}, 1_000);
