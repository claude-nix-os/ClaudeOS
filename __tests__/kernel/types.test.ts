/**
 * Tests for kernel/types.ts
 *
 * Validates type structures and ensures type guards work correctly.
 */

import { describe, it, expect } from 'vitest';
import type {
  ClaudeOSModule,
  ModuleManifest,
  ModuleRegistry,
  Session,
  Message,
  ToolCall,
  ActivityBarItem,
  PanelDefinition,
  SidebarSection,
  SettingsPage,
  StatusBarItem,
  BottomPanelTab,
  ApiRouteDefinition,
  WsHandlerDefinition,
  ServiceDefinition,
  SkillDefinition,
  HookDefinition,
  ModulesConfig,
  BuildManifest,
} from '../../kernel/types';

describe('Type Definitions', () => {
  it('should allow creating a valid ClaudeOSModule', () => {
    const mod: ClaudeOSModule = {
      name: 'test-module',
      version: '1.0.0',
      description: 'A test module',
    };

    expect(mod.name).toBe('test-module');
    expect(mod.version).toBe('1.0.0');
    expect(mod.description).toBe('A test module');
    expect(mod.requires).toBeUndefined();
    expect(mod.optional).toBeUndefined();
    expect(mod.panels).toBeUndefined();
  });

  it('should allow creating a full ClaudeOSModule with all extensions', () => {
    const mod: ClaudeOSModule = {
      name: 'full-module',
      version: '2.0.0',
      description: 'Full module',
      requires: ['dep-a'],
      optional: ['opt-b'],
      activityBarItems: [
        { id: 'ab1', icon: 'Terminal', tooltip: 'Terminal', position: 'top', priority: 1 },
      ],
      panels: [
        { id: 'p1', title: 'Panel', icon: 'Layout', component: 'Panel.tsx' },
      ],
      sidebarSections: [
        { id: 's1', title: 'Sidebar', icon: 'Menu', component: 'Sidebar.tsx', priority: 1 },
      ],
      settingsPages: [
        { id: 'set1', title: 'Settings', icon: 'Settings', component: 'Settings.tsx', priority: 1 },
      ],
      statusBarItems: [
        { id: 'sb1', component: 'Status.tsx', position: 'left', priority: 1 },
      ],
      bottomPanelTabs: [
        { id: 'bp1', title: 'Output', icon: 'Terminal', component: 'Output.tsx', priority: 1 },
      ],
      apiRoutes: [
        { path: '/api/test', handler: 'handler.ts', methods: ['GET', 'POST'] },
      ],
      wsHandlers: [
        { messageType: 'test_msg', handler: 'ws-handler.ts' },
      ],
      services: [
        { name: 'test-svc', command: 'node', args: ['server.js'], port: 8080 },
      ],
      skills: [
        { name: 'test-skill', description: 'A test skill', handler: 'skill.md' },
      ],
      hooks: [
        { event: 'PreToolUse', handler: 'hook.ts' },
      ],
      onLoad: async () => {},
      onUnload: async () => {},
    };

    expect(mod.activityBarItems).toHaveLength(1);
    expect(mod.panels).toHaveLength(1);
    expect(mod.apiRoutes).toHaveLength(1);
    expect(mod.services).toHaveLength(1);
    expect(mod.skills).toHaveLength(1);
    expect(mod.hooks).toHaveLength(1);
  });

  it('should allow creating a valid ModuleManifest', () => {
    const manifest: ModuleManifest = {
      name: '@claude-nix-os/module-test',
      version: '1.0.0',
      description: 'Test module',
      main: 'index.ts',
      author: 'Test Author',
      license: 'MIT',
      repository: 'https://github.com/test/test',
      requires: ['dep-a'],
      optional: ['opt-b'],
      files: ['*.ts', '*.tsx'],
    };

    expect(manifest.name).toBe('@claude-nix-os/module-test');
    expect(manifest.main).toBe('index.ts');
  });

  it('should allow creating a valid Session', () => {
    const session: Session = {
      id: 'session-123',
      title: 'Test Session',
      status: 'idle',
      messages: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(session.status).toBe('idle');
    expect(session.messages).toHaveLength(0);
  });

  it('should allow creating a Session with messages', () => {
    const msg: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const assistantMsg: Message = {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there!',
      thinking: 'Processing user greeting',
      toolCalls: [
        {
          id: 'tc-1',
          name: 'Bash',
          input: 'echo hello',
          output: 'hello',
          status: 'complete',
        },
      ],
      timestamp: '2024-01-01T00:00:01Z',
    };

    const session: Session = {
      id: 'session-456',
      title: 'Chat Session',
      status: 'active',
      claudeSessionId: 'claude-sess-789',
      messages: [msg, assistantMsg],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:01Z',
      unread: 1,
    };

    expect(session.messages).toHaveLength(2);
    expect(session.messages[1].toolCalls).toHaveLength(1);
    expect(session.messages[1].toolCalls![0].status).toBe('complete');
  });

  it('should allow creating an empty ModuleRegistry', () => {
    const registry: ModuleRegistry = {
      modules: {},
      panels: [],
      activityBarItems: [],
      sidebarSections: [],
      settingsPages: [],
      statusBarItems: [],
      bottomPanelTabs: [],
      apiRoutes: [],
      wsHandlers: [],
      services: [],
    };

    expect(Object.keys(registry.modules)).toHaveLength(0);
  });

  it('should allow creating a ModulesConfig', () => {
    const config: ModulesConfig = {
      modules: {
        '@claude-nix-os/module-ui': { enabled: true },
        '@claude-nix-os/module-memory': { enabled: false, settings: { maxEntries: 1000 } },
      },
    };

    expect(config.modules['@claude-nix-os/module-ui'].enabled).toBe(true);
    expect(config.modules['@claude-nix-os/module-memory'].enabled).toBe(false);
  });

  it('should allow creating a BuildManifest', () => {
    const manifest: BuildManifest = {
      version: '3.0.0',
      builtAt: '2024-01-01T00:00:00Z',
      modules: [
        { name: 'module-a', version: '1.0.0', path: 'modules/a' },
      ],
      services: [
        { name: 'svc-a', command: 'node', args: ['svc.js'], port: 8080 },
      ],
    };

    expect(manifest.version).toBe('3.0.0');
    expect(manifest.modules).toHaveLength(1);
    expect(manifest.services).toHaveLength(1);
  });

  it('should support all ToolCall statuses', () => {
    const statuses: ToolCall['status'][] = ['pending', 'running', 'complete', 'error'];

    for (const status of statuses) {
      const tc: ToolCall = {
        id: 'tc-1',
        name: 'Test',
        input: '{}',
        status,
      };
      expect(tc.status).toBe(status);
    }
  });

  it('should support all Session statuses', () => {
    const statuses: Session['status'][] = ['active', 'idle', 'archived', 'error'];

    for (const status of statuses) {
      const session: Session = {
        id: 's-1',
        title: 'Test',
        status,
        messages: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      expect(session.status).toBe(status);
    }
  });

  it('should support all HTTP methods', () => {
    const route: ApiRouteDefinition = {
      path: '/api/test',
      handler: 'handler.ts',
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    };

    expect(route.methods).toHaveLength(5);
  });

  it('should support service definitions with all options', () => {
    const service: ServiceDefinition = {
      name: 'full-service',
      command: '/usr/bin/service',
      args: ['--config', '/etc/service.conf'],
      port: 8080,
      healthCheck: '/health',
      env: { NODE_ENV: 'production', DEBUG: 'true' },
      user: 'service-user',
      priority: 10,
      startDelay: 5,
    };

    expect(service.name).toBe('full-service');
    expect(service.env).toHaveProperty('NODE_ENV');
    expect(service.priority).toBe(10);
    expect(service.startDelay).toBe(5);
  });
});
