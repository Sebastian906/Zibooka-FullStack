import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('User API (e2e)', () => {
    let app: INestApplication;
    let connection: Connection;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );

        app.setGlobalPrefix('api');

        await app.init();

        connection = moduleFixture.get<Connection>(getConnectionToken());
    });

    afterAll(async () => {
        // Clean up test data
        await connection.collection('users').deleteMany({});
        await app.close();
    });

    describe('/api/user/register (POST)', () => {
        it('should register a new user successfully', () => {
            return request(app.getHttpServer())
                .post('/api/user/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    phone: '+1234567890',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.user).toHaveProperty('email', 'test@example.com');
                    expect(res.body.user).toHaveProperty('name', 'Test User');
                    expect(res.headers['set-cookie']).toBeDefined();
                });
        });

        it('should fail with invalid email', () => {
            return request(app.getHttpServer())
                .post('/api/user/register')
                .send({
                    name: 'Test User',
                    email: 'invalid-email',
                    password: 'password123',
                    phone: '+1234567890',
                })
                .expect(400);
        });

        it('should fail with short password', () => {
            return request(app.getHttpServer())
                .post('/api/user/register')
                .send({
                    name: 'Test User',
                    email: 'test2@example.com',
                    password: 'short',
                    phone: '+1234567890',
                })
                .expect(400);
        });

        it('should fail when user already exists', () => {
            return request(app.getHttpServer())
                .post('/api/user/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    phone: '+1234567890',
                })
                .expect(409);
        });
    });

    describe('/api/user/login (POST)', () => {
        it('should login user with valid credentials', () => {
            return request(app.getHttpServer())
                .post('/api/user/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    phone: '+1234567890',
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.user).toHaveProperty('email', 'test@example.com');
                    expect(res.headers['set-cookie']).toBeDefined();
                });
        });

        it('should fail with non-existent user', () => {
            return request(app.getHttpServer())
                .post('/api/user/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123',
                    phone: '+1234567890',
                })
                .expect(401);
        });

        it('should fail with wrong password', () => {
            return request(app.getHttpServer())
                .post('/api/user/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword',
                    phone: '+1234567890',
                })
                .expect(401);
        });
    });

    describe('/api/user/logout (POST)', () => {
        let authToken: string;

        beforeAll(async () => {
            // Primero hacer login para obtener token
            const loginResponse = await request(app.getHttpServer())
                .post('/api/user/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    phone: '+1234567890',
                });

            const cookies = loginResponse.headers['set-cookie'];
            authToken = cookies[0];
        });

        it('should logout user successfully', () => {
            return request(app.getHttpServer())
                .post('/api/user/logout')
                .set('Cookie', authToken)
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.message).toBe('Successfully logged out');
                });
        });
    });

    describe('/api/user/is-auth (GET)', () => {
        let authToken: string;

        beforeAll(async () => {
            // Primero hacer login para obtener token
            const loginResponse = await request(app.getHttpServer())
                .post('/api/user/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    phone: '+1234567890',
                });

            const cookies = loginResponse.headers['set-cookie'];
            authToken = cookies[0];
        });

        it('should return user data when authenticated', () => {
            return request(app.getHttpServer())
                .get('/api/user/is-auth')
                .set('Cookie', authToken)
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.user).toHaveProperty('email');
                    expect(res.body.user).toHaveProperty('name');
                });
        });

        it('should return 401 when not authenticated', () => {
            return request(app.getHttpServer())
                .get('/api/user/is-auth')
                .expect(401);
        });
    });
});