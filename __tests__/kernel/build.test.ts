/**
 * Tests for kernel/build.ts build pipeline
 *
 * Since build.ts runs as a script, we test the underlying functions
 * it uses from module-loader.ts and verify the build artifacts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  discoverModules,
  loadModulesConfig,
  buildStaticRegistry,
} from '../../kernel/module-loader';
import type { ModulesConfig, ModuleManifest } from '../../kernel/types';

const ROOT_DIR = path.resolve(__dirname, '..', '..');

describe('Build Pipeline Functions', () => {
  describe('buildStaticRegistry', () => {
    const makeDiscovered = (
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
      modulePath: `/test-modules/${name}`,
    });

    it('should build empty registry with no modules', () => {
      const config: ModulesConfig = { modules: {} };
      const result = buildStaticRegistry([], config);

      expect(result.modules).toHaveLength(0);
      expect(result.sorted).toHaveLength(0);
    });

    it('should filter out disabled modules', () => {
      const config: ModulesConfig = {
        modules: {
          'module-a': { enabled: true },
          'module-b': { enabled: false },
        },
      };

      const discovered = [
        makeDiscovered('module-a'),
        makeDiscovered('module-b'),
      ];

      const result = buildStaticRegistry(discovered, config);
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].manifest.name).toBe('module-a');
    });

    it('should treat modules not in config as enabled', () => {
      const config: ModulesConfig = { modules: {} };
      const discovered = [makeDiscovered('new-module')];

      const result = buildStaticRegistry(discovered, config);
      expect(result.modules).toHaveLength(1);
    });

    it('should maintain dependency order', () => {
      const config: ModulesConfig = { modules: {} };
      const discovered = [
        makeDiscovered('module-c', ['module-b']),
        makeDiscovered('module-b', ['module-a']),
        makeDiscovered('module-a'),
      ];

      const result = buildStaticRegistry(discovered, config);
      const names = result.modules.map((m) => m.manifest.name);
      expect(names).toEqual(['module-a', 'module-b', 'module-c']);
    });
  });

  describe('Generated files structure', () => {
    it('should have generated directory in src', () => {
      const generatedDir = path.join(ROOT_DIR, 'src', 'generated');
      // The directory should exist (we created .gitkeep)
      expect(fs.existsSync(generatedDir)).toBe(true);
    });
  });

  describe('Template files', () => {
    it('should have Dockerfile.template', () => {
      const templatePath = path.join(ROOT_DIR, 'Dockerfile.template');
      expect(fs.existsSync(templatePath)).toBe(true);
    });

    it('should have entrypoint.sh.template', () => {
      const templatePath = path.join(ROOT_DIR, 'entrypoint.sh.template');
      expect(fs.existsSync(templatePath)).toBe(true);
    });

    it('should have supervisord.conf.template', () => {
      const templatePath = path.join(ROOT_DIR, 'supervisord.conf.template');
      expect(fs.existsSync(templatePath)).toBe(true);
    });

    it('Dockerfile.template should contain MODULE_INSTALL_PLACEHOLDER', () => {
      const content = fs.readFileSync(
        path.join(ROOT_DIR, 'Dockerfile.template'),
        'utf-8',
      );
      expect(content).toContain('MODULE_INSTALL_PLACEHOLDER');
    });

    it('entrypoint.sh.template should contain MODULE_INIT_PLACEHOLDER', () => {
      const content = fs.readFileSync(
        path.join(ROOT_DIR, 'entrypoint.sh.template'),
        'utf-8',
      );
      expect(content).toContain('MODULE_INIT_PLACEHOLDER');
    });

    it('supervisord.conf.template should contain MODULE_SERVICES_PLACEHOLDER', () => {
      const content = fs.readFileSync(
        path.join(ROOT_DIR, 'supervisord.conf.template'),
        'utf-8',
      );
      expect(content).toContain('MODULE_SERVICES_PLACEHOLDER');
    });
  });
});
