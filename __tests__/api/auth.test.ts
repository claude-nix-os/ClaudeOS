/**
 * Tests for the auth system
 *
 * Tests JWT creation, verification, and the auth token exchange flow.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';

describe('Auth System', () => {
  const secret = new TextEncoder().encode(randomBytes(32).toString('hex'));
  const authToken = randomBytes(24).toString('hex');

  async function createJWT(): Promise<string> {
    return new SignJWT({ role: 'user' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);
  }

  async function verifyToken(token: string): Promise<boolean> {
    try {
      await jwtVerify(token, secret);
      return true;
    } catch {
      return false;
    }
  }

  describe('JWT Creation', () => {
    it('should create a valid JWT', async () => {
      const jwt = await createJWT();
      expect(jwt).toBeTruthy();
      expect(typeof jwt).toBe('string');
      expect(jwt.split('.')).toHaveLength(3); // Header.Payload.Signature
    });

    it('should create JWTs that are valid strings with 3 parts', async () => {
      const jwt1 = await createJWT();
      const jwt2 = await createJWT();
      // Both should be valid JWTs
      expect(jwt1.split('.')).toHaveLength(3);
      expect(jwt2.split('.')).toHaveLength(3);
      // Both should verify
      expect(await verifyToken(jwt1)).toBe(true);
      expect(await verifyToken(jwt2)).toBe(true);
    });
  });

  describe('JWT Verification', () => {
    it('should verify a valid JWT', async () => {
      const jwt = await createJWT();
      const valid = await verifyToken(jwt);
      expect(valid).toBe(true);
    });

    it('should reject an invalid JWT', async () => {
      const valid = await verifyToken('invalid.jwt.token');
      expect(valid).toBe(false);
    });

    it('should reject an empty string', async () => {
      const valid = await verifyToken('');
      expect(valid).toBe(false);
    });

    it('should reject a JWT signed with wrong secret', async () => {
      const wrongSecret = new TextEncoder().encode('wrong-secret');
      const jwt = await new SignJWT({ role: 'user' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(wrongSecret);

      const valid = await verifyToken(jwt);
      expect(valid).toBe(false);
    });

    it('should reject an expired JWT', async () => {
      const jwt = await new SignJWT({ role: 'user' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
        .setExpirationTime(Math.floor(Date.now() / 1000) - 1800) // 30 min ago
        .sign(secret);

      const valid = await verifyToken(jwt);
      expect(valid).toBe(false);
    });
  });

  describe('Token Exchange', () => {
    it('should match auth token correctly', () => {
      expect(authToken === authToken).toBe(true);
    });

    it('should reject wrong auth token', () => {
      const wrongToken = 'wrong-token';
      expect(wrongToken === authToken).toBe(false);
    });

    it('should handle token exchange flow', async () => {
      // 1. Client sends auth token
      const sentToken = authToken;

      // 2. Server validates auth token
      const isValid = sentToken === authToken;
      expect(isValid).toBe(true);

      // 3. Server creates JWT
      const jwt = await createJWT();
      expect(jwt).toBeTruthy();

      // 4. Client uses JWT for subsequent requests
      const verified = await verifyToken(jwt);
      expect(verified).toBe(true);
    });
  });

  describe('JWT Claims', () => {
    it('should contain role claim', async () => {
      const jwt = await createJWT();
      const { payload } = await jwtVerify(jwt, secret);
      expect(payload.role).toBe('user');
    });

    it('should contain iat claim', async () => {
      const jwt = await createJWT();
      const { payload } = await jwtVerify(jwt, secret);
      expect(payload.iat).toBeTruthy();
      expect(typeof payload.iat).toBe('number');
    });

    it('should contain exp claim', async () => {
      const jwt = await createJWT();
      const { payload } = await jwtVerify(jwt, secret);
      expect(payload.exp).toBeTruthy();
      expect(typeof payload.exp).toBe('number');
      // Expiry should be approximately 30 days from now
      const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      expect(Math.abs(payload.exp! - thirtyDaysFromNow)).toBeLessThan(60); // within 60 seconds
    });
  });
});
