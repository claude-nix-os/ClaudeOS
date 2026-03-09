/**
 * Tests for module CLI commands (unit-level logic)
 *
 * Tests the logic used by add-module, remove-module, and list-modules.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ModulesConfig, ModuleManifest } from '../../kernel/types';
import {
  loadModulesConfig,
  saveModulesConfig,
  validateManifest,
  discoverModules,
  resolveDependencies,
} from '../../kernel/module-loader';

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const MODULES_CONFIG_PATH = path.join(ROOT_DIR, 'modules.json');

describe('Module CLI Logic', () => {
  let originalConfig: string;

  beforeEach(() => {
    // Save original modules.json
    if (fs.existsSync(MODULES_CONFIG_PATH)) {
      originalConfig = fs.readFileSync(MODULES_CONFIG_PATH, 'utf-8');
    }
  });

  afterEach(() => {
    // Restore original modules.json
    if (originalConfig) {
      fs.writeFileSync(MODULES_CONFIG_PATH, originalConfig);
    }
  });

  describe('add-module logic', () => {
    it('should validate a module manifest', () => {
      const manifest = {
        name: '@claude-nix-os/module-test',
        version: '1.0.0',
        description: 'Test module',
        main: 'index.ts',
      };

      const validated = validateManifest(manifest, '/test');
      expect(validated.name).toBe('@claude-nix-os/module-test');
    });

    it('should reject invalid manifest', () => {
      expect(() => validateManifest({}, '/test')).toThrow();
    });

    it('should save module config', () => {
      const config: ModulesConfig = {
        modules: {
          'test-module': { enabled: true },
        },
      };

      saveModulesConfig(config);

      const loaded = loadModulesConfig();
      expect(loaded.modules['test-module']).toBeDefined();
      expect(loaded.modules['test-module'].enabled).toBe(true);
    });
  });

  describe('remove-module logic', () => {
    it('should check for dependents before removal', () => {
      const makeModule = (name: string, requires: string[] = []) => ({
        manifest: {
          name,
          version: '1.0.0',
          description: `Module ${name}`,
          main: 'index.ts',
          requires,
        } as ModuleManifest,
        modulePath: `/modules/${name}`,
      });

      const modules = [
        makeModule('core'),
        makeModule('dependent', ['core']),
      ];

      // Find dependents of 'core'
      const dependents = modules.filter(
        (m) =>
          m.manifest.name !== 'core' &&
          m.manifest.requires?.includes('core'),
      );

      expect(dependents).toHaveLength(1);
      expect(dependents[0].manifest.name).toBe('dependent');
    });

    it('should allow removal when no dependents exist', () => {
      const makeModule = (name: string, requires: string[] = []) => ({
        manifest: {
          name,
          version: '1.0.0',
          description: `Module ${name}`,
          main: 'index.ts',
          requires,
        } as ModuleManifest,
        modulePath: `/modules/${name}`,
      });

      const modules = [makeModule('standalone')];

      const dependents = modules.filter(
        (m) =>
          m.manifest.name !== 'standalone' &&
          m.manifest.requires?.includes('standalone'),
      );

      expect(dependents).toHaveLength(0);
    });
  });

  describe('list-modules logic', () => {
    it('should handle empty modules list', () => {
      const discovered = discoverModules();
      expect(Array.isArray(discovered)).toBe(true);
    });

    it('should resolve dependencies for listing', () => {
      const makeModule = (name: string, requires: string[] = []) => ({
        manifest: {
          name,
          version: '1.0.0',
          description: `Module ${name}`,
          main: 'index.ts',
          requires,
        } as ModuleManifest,
        modulePath: `/modules/${name}`,
      });

      const modules = [
        makeModule('b', ['a']),
        makeModule('a'),
      ];

      const sorted = resolveDependencies(modules);
      expect(sorted[0].manifest.name).toBe('a');
      expect(sorted[1].manifest.name).toBe('b');
    });
  });
});
