/**
 * Tests for src/stores/kernel-store.ts
 *
 * Tests kernel state management.
 * Note: In node test environment, `typeof window === 'undefined'` so
 * localStorage branches are not hit. We test the state logic directly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('KernelStore', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should initialize with null jwt in node environment', async () => {
    const { useKernelStore } = await import('../../src/stores/kernel-store');
    const state = useKernelStore.getState();

    // In node environment (no window), jwt defaults to null
    expect(state.jwt).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });

  it('should set jwt and update isLoggedIn', async () => {
    const { useKernelStore } = await import('../../src/stores/kernel-store');

    useKernelStore.getState().setJwt('test-jwt-token');

    const state = useKernelStore.getState();
    expect(state.jwt).toBe('test-jwt-token');
    expect(state.isLoggedIn).toBe(true);
  });

  it('should clear jwt on null', async () => {
    const { useKernelStore } = await import('../../src/stores/kernel-store');

    useKernelStore.getState().setJwt('test-jwt-token');
    useKernelStore.getState().setJwt(null);

    const state = useKernelStore.getState();
    expect(state.jwt).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });

  it('should update websocket connection state', async () => {
    const { useKernelStore } = await import('../../src/stores/kernel-store');

    useKernelStore.getState().setWsConnected(true);

    let state = useKernelStore.getState();
    expect(state.wsConnected).toBe(true);
    expect(state.wsReconnecting).toBe(false);

    useKernelStore.getState().setWsReconnecting(true);

    state = useKernelStore.getState();
    expect(state.wsReconnecting).toBe(true);

    // Connecting should clear reconnecting
    useKernelStore.getState().setWsConnected(true);

    state = useKernelStore.getState();
    expect(state.wsConnected).toBe(true);
    expect(state.wsReconnecting).toBe(false);
  });

  it('should set modules and mark as loaded', async () => {
    const { useKernelStore } = await import('../../src/stores/kernel-store');

    const modules = [
      {
        name: 'module-a',
        version: '1.0.0',
        description: 'Module A',
        enabled: true,
      },
      {
        name: 'module-b',
        version: '2.0.0',
        description: 'Module B',
        enabled: false,
      },
    ];

    useKernelStore.getState().setModules(modules);

    const state = useKernelStore.getState();
    expect(state.modules).toHaveLength(2);
    expect(state.modules[0].name).toBe('module-a');
    expect(state.modules[1].name).toBe('module-b');
    expect(state.modulesLoaded).toBe(true);
  });

  it('should logout and clear all state', async () => {
    const { useKernelStore } = await import('../../src/stores/kernel-store');

    // Set up state
    useKernelStore.getState().setJwt('test-jwt');
    useKernelStore.getState().setWsConnected(true);
    useKernelStore.getState().setModules([
      { name: 'mod', version: '1.0', description: 'Mod', enabled: true },
    ]);

    // Verify pre-logout state
    expect(useKernelStore.getState().isLoggedIn).toBe(true);

    // Logout
    useKernelStore.getState().logout();

    const state = useKernelStore.getState();
    expect(state.jwt).toBeNull();
    expect(state.isLoggedIn).toBe(false);
    expect(state.wsConnected).toBe(false);
    expect(state.modules).toHaveLength(0);
    expect(state.modulesLoaded).toBe(false);
  });

  it('should start with empty modules', async () => {
    const { useKernelStore } = await import('../../src/stores/kernel-store');

    const state = useKernelStore.getState();
    expect(state.modules).toHaveLength(0);
    expect(state.modulesLoaded).toBe(false);
  });

  it('should default websocket state to disconnected', async () => {
    const { useKernelStore } = await import('../../src/stores/kernel-store');

    const state = useKernelStore.getState();
    expect(state.wsConnected).toBe(false);
    expect(state.wsReconnecting).toBe(false);
  });
});
