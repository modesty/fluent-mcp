// Import Jest utilities
import { expect, test, describe } from '@jest/globals';
import path from 'path';
import fs from 'fs';

// Mock the module with a factory BEFORE importing it
jest.mock('../config', () => ({
  getProjectRootPath: jest.fn(() => process.cwd()),
}));

// Replace require with jest.requireMock
const configModule = jest.requireMock('../config');

describe('Config Module', () => {
  test('getProjectRootPath returns a valid directory path', () => {
    const rootPath = configModule.getProjectRootPath();

    // Check if the path exists and is a directory
    expect(fs.existsSync(rootPath)).toBe(true);
    expect(fs.statSync(rootPath).isDirectory()).toBe(true);

    // The root path should contain package.json
    const packageJsonPath = path.join(rootPath, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    // It should also contain the src and res folders
    expect(fs.existsSync(path.join(rootPath, 'src'))).toBe(true);
    expect(fs.existsSync(path.join(rootPath, 'res'))).toBe(true);
  });
});
