/**
 * Tests for session management logic
 *
 * Tests session creation, listing, archiving, and deletion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Session, Message } from '../../kernel/types';

// Session management functions (extracted logic for testing)
function createTestSession(
  sessions: Map<string, Session>,
  title?: string,
): Session {
  const id = Math.random().toString(36).substring(2, 14);
  const session: Session = {
    id,
    title: title || 'New Session',
    messages: [],
    status: 'idle',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unread: 0,
  };
  sessions.set(id, session);
  return session;
}

function archiveTestSession(
  sessions: Map<string, Session>,
  id: string,
): boolean {
  const session = sessions.get(id);
  if (!session) return false;
  session.status = 'archived';
  session.updatedAt = new Date().toISOString();
  return true;
}

function deleteTestSession(
  sessions: Map<string, Session>,
  id: string,
): boolean {
  return sessions.delete(id);
}

describe('Session Management', () => {
  let sessions: Map<string, Session>;

  beforeEach(() => {
    sessions = new Map();
  });

  describe('createSession', () => {
    it('should create a session with default title', () => {
      const session = createTestSession(sessions);

      expect(session.id).toBeTruthy();
      expect(session.title).toBe('New Session');
      expect(session.status).toBe('idle');
      expect(session.messages).toHaveLength(0);
      expect(session.createdAt).toBeTruthy();
      expect(session.updatedAt).toBeTruthy();
    });

    it('should create a session with custom title', () => {
      const session = createTestSession(sessions, 'My Custom Session');

      expect(session.title).toBe('My Custom Session');
    });

    it('should store session in the map', () => {
      const session = createTestSession(sessions);

      expect(sessions.has(session.id)).toBe(true);
      expect(sessions.get(session.id)).toBe(session);
    });

    it('should create unique session IDs', () => {
      const session1 = createTestSession(sessions);
      const session2 = createTestSession(sessions);

      expect(session1.id).not.toBe(session2.id);
      expect(sessions.size).toBe(2);
    });
  });

  describe('archiveSession', () => {
    it('should archive an existing session', () => {
      const session = createTestSession(sessions);
      const result = archiveTestSession(sessions, session.id);

      expect(result).toBe(true);
      expect(session.status).toBe('archived');
    });

    it('should return false for non-existent session', () => {
      const result = archiveTestSession(sessions, 'nonexistent');

      expect(result).toBe(false);
    });

    it('should update the updatedAt timestamp', () => {
      const session = createTestSession(sessions);
      // Set a known old timestamp
      session.updatedAt = '2020-01-01T00:00:00Z';

      archiveTestSession(sessions, session.id);

      expect(session.updatedAt).not.toBe('2020-01-01T00:00:00Z');
    });
  });

  describe('deleteSession', () => {
    it('should delete an existing session', () => {
      const session = createTestSession(sessions);
      const result = deleteTestSession(sessions, session.id);

      expect(result).toBe(true);
      expect(sessions.has(session.id)).toBe(false);
    });

    it('should return false for non-existent session', () => {
      const result = deleteTestSession(sessions, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('Message handling', () => {
    it('should add messages to a session', () => {
      const session = createTestSession(sessions);

      const msg: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date().toISOString(),
      };

      session.messages.push(msg);
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].content).toBe('Hello world');
    });

    it('should support all message roles', () => {
      const session = createTestSession(sessions);

      const roles: Message['role'][] = ['user', 'assistant', 'system', 'tool'];

      for (const role of roles) {
        session.messages.push({
          id: `msg-${role}`,
          role,
          content: `Message from ${role}`,
          timestamp: new Date().toISOString(),
        });
      }

      expect(session.messages).toHaveLength(4);
    });

    it('should handle messages with tool calls', () => {
      const session = createTestSession(sessions);

      const msg: Message = {
        id: 'msg-with-tools',
        role: 'assistant',
        content: 'Let me check that.',
        thinking: 'I need to look at the file system.',
        toolCalls: [
          {
            id: 'tc-1',
            name: 'Bash',
            input: 'ls -la',
            output: 'total 0\ndrwxr-xr-x  2 user  staff  64 Jan  1 00:00 .',
            status: 'complete',
          },
          {
            id: 'tc-2',
            name: 'Read',
            input: '/tmp/test.txt',
            status: 'pending',
          },
        ],
        timestamp: new Date().toISOString(),
      };

      session.messages.push(msg);
      expect(session.messages[0].toolCalls).toHaveLength(2);
      expect(session.messages[0].toolCalls![0].status).toBe('complete');
      expect(session.messages[0].toolCalls![1].status).toBe('pending');
    });
  });

  describe('Session listing', () => {
    it('should list sessions sorted by updatedAt', () => {
      const session1 = createTestSession(sessions, 'First');
      session1.updatedAt = '2024-01-01T00:00:00Z';

      const session2 = createTestSession(sessions, 'Second');
      session2.updatedAt = '2024-01-02T00:00:00Z';

      const session3 = createTestSession(sessions, 'Third');
      session3.updatedAt = '2024-01-03T00:00:00Z';

      const list = Array.from(sessions.values()).sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      expect(list[0].title).toBe('Third');
      expect(list[1].title).toBe('Second');
      expect(list[2].title).toBe('First');
    });

    it('should handle empty sessions list', () => {
      const list = Array.from(sessions.values());
      expect(list).toHaveLength(0);
    });
  });
});
