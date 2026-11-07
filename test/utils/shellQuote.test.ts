import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shellQuote } from '../../src/utils/shellQuote.js';
import { SHELLS, ZSH, ZSH_MAGIC_EQUAL_SUBST, shellSplit, zshAvailable } from '../support/shell.js';

describe('shellQuote', () => {
  it('leaves a shell-safe entry unchanged', () => {
    assert.equal(shellQuote('--packageName=my-app'), '--packageName=my-app');
    assert.equal(shellQuote('/usr/bin/node'), '/usr/bin/node');
    assert.equal(shellQuote('--query=a=b'), '--query=a=b');
    assert.equal(shellQuote('--a=b:c'), '--a=b:c');
  });

  it('single-quotes anything else, escaping embedded single quotes', () => {
    assert.equal(shellQuote('--appName=My App'), "'--appName=My App'");
    assert.equal(shellQuote("it's"), `'it'\\''s'`);
    assert.equal(shellQuote(''), "''");
  });

  it('quotes an "=" where zsh equals expansion can apply', () => {
    for (const entry of ['=node', '--appName==node', '--auth==node', '--a=x:=node', '--a=:=node']) {
      assert.equal(shellQuote(entry), `'${entry}'`);
    }
  });

  const entries = [
    "'My App' --help ''", 'a b', "it's", '"x"', '$(id)', '`id`', '$HOME', 'a;b', 'a|b', 'a&b', '*', '~',
    'back\\slash', "''", '"', '!', '#x', 'tab\there', '', '=node', '--appName==node', '--auth==node',
    '--a=x:=node', '--a=:=node', '--a=b,=node', '--a=/x==node', '--x=~/y', '--x=a:~/y', '--plain=value',
  ];

  for (const shell of SHELLS) {
    it(`${shell.name} yields exactly the entry back`, { skip: process.platform === 'win32' }, () => {
      assert.deepEqual(shellSplit(entries.map(shellQuote).join(' '), shell), entries);
    });
  }

  it('negative control: zsh expands the unquoted equals forms', { skip: !zshAvailable }, () => {
    assert.notEqual(shellSplit('=node', ZSH)[0], '=node');
    assert.equal(shellSplit('--auth==node', ZSH)[0], '--auth==node');
    assert.notEqual(shellSplit('--auth==node', ZSH_MAGIC_EQUAL_SUBST)[0], '--auth==node');
    assert.notEqual(shellSplit('--a=x:=node', ZSH_MAGIC_EQUAL_SUBST)[0], '--a=x:=node');
  });
});
