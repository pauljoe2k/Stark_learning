import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import type { AuthRepository, PublicUser, StoredUser } from '../src/repositories/auth.repository.js';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';

class MemoryAuthRepository implements AuthRepository {
  private readonly users = new Map<number, StoredUser>();
  private nextId = 1;

  async findByEmail(email: string): Promise<StoredUser | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findById(id: number): Promise<PublicUser | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }

  async create(input: { name: string; email: string; passwordHash: string }): Promise<PublicUser> {
    const user: StoredUser = { id: this.nextId, name: input.name, email: input.email, passMark: 70, passwordHash: input.passwordHash };
    this.users.set(this.nextId, user);
    this.nextId += 1;
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }
}

function setup() {
  const service = new AuthService(new MemoryAuthRepository(), 'test-secret-with-more-than-thirty-two-characters');
  const app = createApp({
    authService: service,
    readiness: {
      database: async () => undefined,
      redis: async () => undefined,
    },
    webOrigin: 'http://localhost:5173',
  });
  return { app, service };
}

test('signup and login return a usable access token without exposing password hashes', async () => {
  const { app } = setup();
  const signup = await request(app).post('/auth/signup').send({
    name: '  Alex  ',
    email: 'ALEX@example.com',
    password: 'a-secure-demo-password',
  });
  assert.equal(signup.status, 201);
  assert.deepEqual(signup.body.user, {
    id: 1,
    name: 'Alex',
    email: 'alex@example.com',
    passMark: 70,
  });
  assert.equal(typeof signup.body.token, 'string');

  const login = await request(app).post('/auth/login').send({
    email: 'alex@example.com',
    password: 'a-secure-demo-password',
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.id, 1);
  assert.equal('passwordHash' in login.body.user, false);

  const duplicate = await request(app).post('/auth/signup').send({
    name: 'Alex',
    email: 'alex@example.com',
    password: 'another-secure-password',
  });
  assert.equal(duplicate.status, 409);
});

test('each authenticated /me request is restricted to the user encoded in its token', async () => {
  const { app, service } = setup();
  const userA = await request(app).post('/auth/signup').send({
    name: 'Alex',
    email: 'alex@example.com',
    password: 'a-secure-demo-password',
  });
  const userB = await request(app).post('/auth/signup').send({
    name: 'Sam',
    email: 'sam@example.com',
    password: 'another-secure-password',
  });

  const responseA = await request(app).get('/me').set('Authorization', `Bearer ${userA.body.token}`);
  const responseB = await request(app).get('/me').set('Authorization', `Bearer ${userB.body.token}`);
  assert.equal(responseA.body.user.email, 'alex@example.com');
  assert.equal(responseB.body.user.email, 'sam@example.com');

  const forgedToken = service.createToken(999);
  const missingUser = await request(app).get('/me').set('Authorization', `Bearer ${forgedToken}`);
  assert.equal(missingUser.status, 401);
});

test('malformed signup payload is rejected with a readable 400 response', async () => {
  const { app } = setup();
  const response = await request(app).post('/auth/signup').send({ name: '', email: 'bad', password: 'short' });
  assert.equal(response.status, 400);
  assert.equal(typeof response.body.error, 'string');
});

test('invalid JSON is returned as a client error rather than an internal error', async () => {
  const { app } = setup();
  const response = await request(app)
    .post('/auth/signup')
    .set('Content-Type', 'application/json')
    .send('{');
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: 'Request body must be valid JSON.',
    code: 'INVALID_JSON',
  });
});
