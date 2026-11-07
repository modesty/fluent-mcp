/**
 * The project-directory contract on a real filesystem: every case is a real
 * path in a temp tree, so realpath, symlinks and directory listings behave as
 * they do in production.
 */
import { after, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loggerFixture } from '../support/fixtures.js';

// The logger is replaced so a developer's FLUENT_MCP_LOG_LEVEL cannot change
// what the run prints. It must be registered before the module is imported.
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const {
  checkInitDestination,
  createInitDestination,
  isWithinDirectory,
  removeCreatedDestination,
  resolveExistingDirectory,
  resolveProjectDirectory,
} = await import('../../src/utils/projectDirectory.js');

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-project-dir-')));
after(() => fs.rmSync(root, { recursive: true, force: true }));

let count = 0;
/** A new path under the temp tree that does not exist yet. */
const fresh = (name = 'dir'): string => path.join(root, `${name}-${++count}`);
const emptyDir = (): string => {
  const dir = fresh('empty');
  fs.mkdirSync(dir);
  return dir;
};
/** A symlink to the filesystem root, or undefined where symlinks need privileges (Windows). */
const linkToRoot = (): string | undefined => {
  const link = fresh('root-link');
  try {
    fs.symlinkSync(path.parse(root).root, link, 'dir');
    return link;
  } catch {
    return undefined;
  }
};

const ROOT = path.parse(root).root;
const INIT_ROOT_ERROR =
  `workingDirectory must identify a dedicated project directory, not "${ROOT}". ` +
  'Supply an empty absolute directory or a new absolute directory path to create.';

describe('resolveProjectDirectory', () => {
  it('returns the canonical path of an existing directory', () => {
    const dir = emptyDir();
    assert.equal(resolveProjectDirectory(`${dir}${path.sep}`, 'src'), dir);
    assert.equal(resolveProjectDirectory(`  ${dir}  `, 'src'), dir);
  });

  it('resolves a symlinked project to its real directory', (t) => {
    const dir = emptyDir();
    const link = fresh('link');
    try {
      fs.symlinkSync(dir, link, 'dir');
    } catch {
      t.skip('symlinks need privileges here');
      return;
    }
    assert.equal(resolveProjectDirectory(link, 'src'), dir);
  });

  for (const [label, value, pattern] of [
    ['a non-string', 42, /src must be a non-empty absolute path/],
    ['an empty string', '  ', /src must be a non-empty absolute path/],
    ['a relative path', 'my-app', /src must be an absolute path, not "my-app"/],
    ['a ~ path', '~/my-app', /src must be an absolute path, not "~\/my-app"/],
    ['the filesystem root', ROOT, /src must identify a dedicated project directory/],
  ] as const) {
    it(`rejects ${label}`, () => {
      assert.throws(() => resolveProjectDirectory(value, 'src'), pattern);
    });
  }

  it('rejects a path that normalizes to the root', () => {
    assert.throws(() => resolveProjectDirectory(path.join(root, '..', '..', '..', '..', '..', '..', '..', '..'), 'src'),
      /must identify a dedicated project directory/);
  });

  it('rejects a symlink to the root, naming what it resolves to', (t) => {
    const link = linkToRoot();
    if (!link) {
      t.skip('symlinks need privileges here');
      return;
    }
    assert.throws(() => resolveProjectDirectory(link, 'src'), {
      message: new RegExp(`not "${escape(link)}" \\(it resolves to "${escape(ROOT)}"\\)`),
    });
  });

  it('rejects a missing directory and a file', () => {
    const missing = fresh('missing');
    assert.throws(() => resolveProjectDirectory(missing, 'src'), { message: new RegExp(`src does not exist: ${escape(missing)}`) });
    const file = fresh('file');
    fs.writeFileSync(file, '');
    assert.throws(() => resolveProjectDirectory(file, 'src'), /src is not a directory/);
  });

  // POSIX realpath reports a path through a file as ENOTDIR; Windows may map it to ENOENT.
  it('reports a path that cannot be resolved for another reason than ENOENT, keeping the cause',
    { skip: process.platform === 'win32' && 'ENOTDIR is a POSIX realpath result' }, () => {
    // A path through a regular file fails realpath with ENOTDIR, not ENOENT, so
    // it is reported as unresolvable rather than as missing.
    const file = fresh('file');
    fs.writeFileSync(file, '');
    const throughFile = path.join(file, 'sub');
    assert.throws(() => resolveProjectDirectory(throughFile, 'src'), (error: Error) => {
      assert.match(error.message, new RegExp(`^src cannot be resolved: ${escape(throughFile)} \\(.*ENOTDIR.*\\)\\. Supply the absolute path of a Fluent project directory\\.$`));
      assert.equal((error.cause as NodeJS.ErrnoException).code, 'ENOTDIR');
      return true;
    });
  });
});

describe('resolveExistingDirectory', () => {
  it('names the kind of directory and the remedy in the root error', () => {
    assert.throws(() => resolveExistingDirectory(ROOT, 'from', 'Do X.', 'an application directory'), {
      message: `from must identify an application directory, not "${ROOT}". Do X.`,
    });
  });
});

describe('checkInitDestination', () => {
  it('accepts an existing empty directory as is', () => {
    const dir = emptyDir();
    assert.deepEqual(checkInitDestination(dir), { directory: dir, create: false });
  });

  it('accepts a new directory under an existing parent, without creating it', () => {
    const dir = fresh('new');
    assert.deepEqual(checkInitDestination(dir), { directory: dir, create: true });
    assert.equal(fs.existsSync(dir), false);
  });

  it('canonicalizes the parent of a new directory', (t) => {
    const parent = emptyDir();
    const link = fresh('parent-link');
    try {
      fs.symlinkSync(parent, link, 'dir');
    } catch {
      t.skip('symlinks need privileges here');
      return;
    }
    assert.deepEqual(checkInitDestination(path.join(link, 'app')), { directory: path.join(parent, 'app'), create: true });
  });

  it('rejects the root with the actionable message', () => {
    assert.throws(() => checkInitDestination(ROOT), { message: INIT_ROOT_ERROR });
  });

  it('rejects a symlink to the root', (t) => {
    const link = linkToRoot();
    if (!link) {
      t.skip('symlinks need privileges here');
      return;
    }
    assert.throws(() => checkInitDestination(link), /must identify a dedicated project directory/);
  });

  for (const value of ['my-app', '~/my-app', './my-app']) {
    it(`rejects ${JSON.stringify(value)}: bare names and ~ are not expanded`, () => {
      assert.throws(() => checkInitDestination(value), {
        message: `workingDirectory must be an absolute path, not "${value}". ` +
          'Supply an empty absolute directory or a new absolute directory path to create.',
      });
    });
  }

  it('rejects a populated directory, whatever it holds', () => {
    const dir = emptyDir();
    fs.writeFileSync(path.join(dir, 'notes.txt'), '');
    assert.throws(() => checkInitDestination(dir), {
      message: new RegExp(`workingDirectory is not empty: ${escape(dir)} \\(contains notes\\.txt\\)\\. Supply an empty`),
    });
  });

  it('points a populated Fluent project at the project tools instead', () => {
    const dir = emptyDir();
    fs.writeFileSync(path.join(dir, 'now.config.json'), '{}');
    assert.throws(() => checkInitDestination(dir), /already holds a Fluent project: .*FLUENT_MCP_WORKING_DIR/);
  });

  it('rejects a new directory whose parent is missing', () => {
    const parent = fresh('missing-parent');
    assert.throws(() => checkInitDestination(path.join(parent, 'app')), {
      message: new RegExp(`The parent directory of workingDirectory does not exist: ${escape(parent)}\\.`),
    });
  });

  it('rejects a file', () => {
    const file = fresh('file');
    fs.writeFileSync(file, '');
    assert.throws(() => checkInitDestination(file), /workingDirectory is not a directory/);
  });
});

describe('checkInitDestination with a conversion source', () => {
  const INSIDE = /workingDirectory must not be the conversion source or inside it: /;

  it('refuses a new or existing destination inside the source, at any depth', () => {
    const source = emptyDir();
    fs.mkdirSync(path.join(source, 'nested', 'empty'), { recursive: true });
    for (const destination of [path.join(source, 'new'), path.join(source, 'nested', 'new'), path.join(source, 'nested', 'empty')]) {
      assert.throws(() => checkInitDestination(destination, source), INSIDE, destination);
    }
  });

  it('refuses the source itself before reporting it populated', () => {
    const source = emptyDir();
    fs.writeFileSync(path.join(source, 'sys_app.xml'), '');
    assert.throws(() => checkInitDestination(source, source), INSIDE);
  });

  it('refuses a destination that reaches the source through a symlink', (t) => {
    const source = emptyDir();
    const link = fresh('source-link');
    try {
      fs.symlinkSync(source, link, 'dir');
    } catch {
      t.skip('symlinks need privileges here');
      return;
    }
    assert.throws(() => checkInitDestination(path.join(link, 'new'), source), INSIDE);
  });

  it('refuses a differently cased spelling of the source on a case-insensitive filesystem', (t) => {
    const source = path.join(emptyDir(), 'Source');
    fs.mkdirSync(source);
    const upper = source.toUpperCase();
    if (!fs.existsSync(upper)) {
      t.skip('case-sensitive filesystem');
      return;
    }
    assert.throws(() => checkInitDestination(path.join(upper, 'new'), source), INSIDE);
  });

  it('accepts a sibling whose name only starts with the source name', () => {
    const source = emptyDir();
    const sibling = `${source}-copy`;
    assert.deepEqual(checkInitDestination(sibling, source), { directory: sibling, create: true });
  });
});

describe('isWithinDirectory', () => {
  for (const [parent, child, expected] of [
    ['/a/src', '/a/src', true],
    ['/a/src', '/a/src/x/y', true],
    ['/a/src', '/a/src-copy', false],
    ['/a/src', '/a', false],
    ['/a/src', '/b/src', false],
    ['/a/src', '/a/src/..x', true],
  ] as const) {
    it(`${child} ${expected ? 'is' : 'is not'} within ${parent}`, { skip: process.platform === 'win32' }, () => {
      assert.equal(isWithinDirectory(parent, child), expected);
    });
  }
});

describe('createInitDestination', () => {
  it('creates a new destination and reports that it owns it', () => {
    const dir = fresh('created');
    assert.equal(createInitDestination(checkInitDestination(dir)), true);
    assert.ok(fs.statSync(dir).isDirectory());
  });

  it('leaves an existing destination alone and reports that it does not own it', () => {
    const dir = emptyDir();
    assert.equal(createInitDestination(checkInitDestination(dir)), false);
  });

  it('fails when the directory appeared after the check', () => {
    const dir = fresh('raced');
    const destination = checkInitDestination(dir);
    fs.mkdirSync(dir);
    assert.throws(() => createInitDestination(destination), /Failed to create workingDirectory .*EEXIST/);
  });
});

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('removeCreatedDestination', () => {
  it('removes an empty directory', () => {
    const dir = emptyDir();
    removeCreatedDestination(dir);
    assert.equal(fs.existsSync(dir), false);
  });

  it('leaves a directory that is no longer empty, and does not throw', () => {
    const dir = emptyDir();
    fs.writeFileSync(path.join(dir, 'partial.txt'), '');
    assert.doesNotThrow(() => removeCreatedDestination(dir));
    assert.deepEqual(fs.readdirSync(dir), ['partial.txt']);
  });

  it('does not throw when the directory is already gone', () => {
    assert.doesNotThrow(() => removeCreatedDestination(fresh('gone')));
  });
});
