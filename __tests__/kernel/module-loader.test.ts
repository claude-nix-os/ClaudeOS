/**
 * Tests for kernel/module-loader.ts
 *
 * Covers:
 *   - Manifest validation
 *   - Module validation
 *   - Dependency resolution (topological sort)
 *   - Cycle detection
 *   - Missing dependency detection
 *   - Module discovery
 *   - Config loading/saving
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  validateManifest,
  validateModule,
  resolveDependencies,
  DependencyCycleError,
  MissingDependencyError,
  ModuleValidationError,
  loadModulesConfig,
  saveModulesConfig,
  discoverModules,
} from '../../kernel/module-loader';
import type { ModuleManifest, ClaudeOSModule } from '../../kernel/types';

// ---------------------------------------------------------------------------
// Manifest Validation
// ---------------------------------------------------------------------------

describe('validateManifest', () => {
  it('should validate a correct manifest', () => {
    const manifest = {
      name: 'test-module',
      version: '1.0.0',
      description: 'A test module',
      main: 'index.ts',
    };

    const result = validateManifest(manifest, '/test');
    expect(result.name).toBe('test-module');
    expect(result.version).toBe('1.0.0');
    expect(result.description).toBe('A test module');
    expect(result.main).toBe('index.ts');
  });

  it('should throw on null manifest', () => {
    expect(() => validateManifest(null, '/test')).toThrow(ModuleValidationError);
  });

  it('should throw on non-object manifest', () => {
    expect(() => validateManifest('string', '/test')).toThrow(ModuleValidationError);
  });

  it('should throw on missing name', () => {
    const manifest = {
      version: '1.0.0',
      description: 'A test module',
      main: 'index.ts',
    };
    expect(() => validateManifest(manifest, '/test')).toThrow('Missing or invalid required field "name"');
  });

  it('should throw on missing version', () => {
    const manifest = {
      name: 'test',
      description: 'A test module',
      main: 'index.ts',
    };
    expect(() => validateManifest(manifest, '/test')).toThrow('Missing or invalid required field "version"');
  });

  it('should throw on missing description', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      main: 'index.ts',
    };
    expect(() => validateManifest(manifest, '/test')).toThrow('Missing or invalid required field "description"');
  });

  it('should throw on missing main', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      description: 'desc',
    };
    expect(() => validateManifest(manifest, '/test')).toThrow('Missing or invalid required field "main"');
  });

  it('should throw on non-array requires', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      description: 'desc',
      main: 'index.ts',
      requires: 'not-an-array',
    };
    expect(() => validateManifest(manifest, '/test')).toThrow('"requires" must be an array of strings');
  });

  it('should throw on non-string requires elements', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      description: 'desc',
      main: 'index.ts',
      requires: [123],
    };
    expect(() => validateManifest(manifest, '/test')).toThrow('"requires" must be an array of strings');
  });

  it('should throw on non-array optional', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      description: 'desc',
      main: 'index.ts',
      optional: 'not-an-array',
    };
    expect(() => validateManifest(manifest, '/test')).toThrow('"optional" must be an array of strings');
  });

  it('should accept valid requires array', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      description: 'desc',
      main: 'index.ts',
      requires: ['dep-a', 'dep-b'],
    };
    const result = validateManifest(manifest, '/test');
    expect(result.requires).toEqual(['dep-a', 'dep-b']);
  });

  it('should accept valid optional array', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      description: 'desc',
      main: 'index.ts',
      optional: ['opt-a'],
    };
    const result = validateManifest(manifest, '/test');
    expect(result.optional).toEqual(['opt-a']);
  });

  it('should accept manifest with all optional fields', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      description: 'desc',
      main: 'index.ts',
      author: 'Test Author',
      license: 'MIT',
      repository: 'https://github.com/test/test',
      requires: [],
      optional: [],
      files: ['*.ts'],
    };
    const result = validateManifest(manifest, '/test');
    expect(result.author).toBe('Test Author');
  });
});

// ---------------------------------------------------------------------------
// Module Validation
// ---------------------------------------------------------------------------

describe('validateModule', () => {
  it('should validate a correct module', () => {
    const mod = {
      name: 'test-module',
      version: '1.0.0',
      description: 'Test module',
    };

    const result = validateModule(mod, 'test');
    expect(result.name).toBe('test-module');
  });

  it('should throw on null module', () => {
    expect(() => validateModule(null, 'test')).toThrow(ModuleValidationError);
  });

  it('should throw on missing name', () => {
    const mod = { version: '1.0.0', description: 'Test' };
    expect(() => validateModule(mod, 'test')).toThrow('must export a "name" string');
  });

  it('should throw on missing version', () => {
    const mod = { name: 'test', description: 'Test' };
    expect(() => validateModule(mod, 'test')).toThrow('must export a "version" string');
  });

  it('should throw on missing description', () => {
    const mod = { name: 'test', version: '1.0.0' };
    expect(() => validateModule(mod, 'test')).toThrow('must export a "description" string');
  });

  it('should throw when array field is not an array', () => {
    const mod = {
      name: 'test',
      version: '1.0.0',
      description: 'Test',
      panels: 'not-an-array',
    };
    expect(() => validateModule(mod, 'test')).toThrow('"panels" must be an array');
  });

  it('should throw when onLoad is not a function', () => {
    const mod = {
      name: 'test',
      version: '1.0.0',
      description: 'Test',
      onLoad: 'not-a-function',
    };
    expect(() => validateModule(mod, 'test')).toThrow('"onLoad" must be a function');
  });

  it('should throw when onUnload is not a function', () => {
    const mod = {
      name: 'test',
      version: '1.0.0',
      description: 'Test',
      onUnload: 42,
    };
    expect(() => validateModule(mod, 'test')).toThrow('"onUnload" must be a function');
  });

  it('should accept module with all extensions', () => {
    const mod = {
      name: 'test',
      version: '1.0.0',
      description: 'Test',
      panels: [{ id: 'panel1', title: 'Panel', icon: 'icon', component: 'Panel' }],
      activityBarItems: [],
      sidebarSections: [],
      settingsPages: [],
      statusBarItems: [],
      bottomPanelTabs: [],
      apiRoutes: [],
      wsHandlers: [],
      services: [],
      skills: [],
      hooks: [],
      onLoad: async () => {},
      onUnload: async () => {},
    };

    const result = validateModule(mod, 'test');
    expect(result.panels).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Dependency Resolution
// ---------------------------------------------------------------------------

describe('resolveDependencies', () => {
  const makeModule = (
    name: string,
    requires: string[] = [],
  ) => ({
    manifest: {
      name,
      version: '1.0.0',
      description: `Module ${name}`,
      main: 'index.ts',
      requires,
    } as ModuleManifest,
    modulePath: `/modules/${name}`,
  });

  it('should return modules in dependency order', () => {
    const modules = [
      makeModule('c', ['b']),
      makeModule('b', ['a']),
      makeModule('a'),
    ];

    const sorted = resolveDependencies(modules);
    const names = sorted.map((m) => m.manifest.name);
    expect(names).toEqual(['a', 'b', 'c']);
  });

  it('should handle modules with no dependencies', () => {
    const modules = [
      makeModule('alpha'),
      makeModule('beta'),
      makeModule('gamma'),
    ];

    const sorted = resolveDependencies(modules);
    expect(sorted).toHaveLength(3);
  });

  it('should detect cycles', () => {
    const modules = [
      makeModule('a', ['b']),
      makeModule('b', ['c']),
      makeModule('c', ['a']),
    ];

    expect(() => resolveDependencies(modules)).toThrow(DependencyCycleError);
  });

  it('should throw on missing dependency', () => {
    const modules = [makeModule('a', ['nonexistent'])];

    expect(() => resolveDependencies(modules)).toThrow(MissingDependencyError);
  });

  it('should handle diamond dependencies', () => {
    const modules = [
      makeModule('d', ['b', 'c']),
      makeModule('c', ['a']),
      makeModule('b', ['a']),
      makeModule('a'),
    ];

    const sorted = resolveDependencies(modules);
    const names = sorted.map((m) => m.manifest.name);

    // 'a' must come before 'b' and 'c', which must come before 'd'
    expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
    expect(names.indexOf('a')).toBeLessThan(names.indexOf('c'));
    expect(names.indexOf('b')).toBeLessThan(names.indexOf('d'));
    expect(names.indexOf('c')).toBeLessThan(names.indexOf('d'));
  });

  it('should handle single module', () => {
    const modules = [makeModule('solo')];
    const sorted = resolveDependencies(modules);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].manifest.name).toBe('solo');
  });

  it('should handle empty array', () => {
    const sorted = resolveDependencies([]);
    expect(sorted).toHaveLength(0);
  });

  it('should handle long dependency chain', () => {
    const modules = [
      makeModule('e', ['d']),
      makeModule('d', ['c']),
      makeModule('c', ['b']),
      makeModule('b', ['a']),
      makeModule('a'),
    ];

    const sorted = resolveDependencies(modules);
    const names = sorted.map((m) => m.manifest.name);
    expect(names).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

// ---------------------------------------------------------------------------
// Config Loading/Saving
// ---------------------------------------------------------------------------

describe('loadModulesConfig', () => {
  it('should return empty config when file does not exist', () => {
    const config = loadModulesConfig();
    // Will return empty if modules.json doesn't have any modules
    expect(config).toHaveProperty('modules');
  });
});

// ---------------------------------------------------------------------------
// Module Discovery
// ---------------------------------------------------------------------------

describe('discoverModules', () => {
  it('should return an array', () => {
    const modules = discoverModules();
    expect(Array.isArray(modules)).toBe(true);
  });

  it('should discover modules from the modules directory if it exists', () => {
    // Since we're running from the project root, this tests the actual discovery
    const modules = discoverModules();
    // With no modules installed, should return empty
    expect(modules).toHaveLength(0);
  });
});
