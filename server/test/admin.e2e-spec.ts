import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Admin API (e2e)', () => {
    let app: INestApplication;

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
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/api/admin/login (POST)', () => {
        it('should login admin with valid credentials', () => {
            return request(app.getHttpServer())
                .post('/api/admin/login')
                .send({
                    email: process.env.ADMIN_EMAIL,
                    password: process.env.ADMIN_PASS,
                    phone: process.env.ADMIN_PHONE,
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.message).toBe('Admin logged in');
                    expect(res.headers['set-cookie']).toBeDefined();
                });
        });

        it('should fail with invalid credentials', () => {
            return request(app.getHttpServer())
                .post('/api/admin/login')
                .send({
                    email: 'wrong@admin.com',
                    password: 'wrongpass',
                    phone: '+0000000000',
                })
                .expect(401);
        });

        it('should fail with missing phone', () => {
            return request(app.getHttpServer())
                .post('/api/admin/login')
                .send({
                    email: process.env.ADMIN_EMAIL,
                    password: process.env.ADMIN_PASS,
                })
                .expect(400);
        });
    });

    describe('/api/admin/is-admin (GET)', () => {
        let adminToken: string;

        beforeAll(async () => {
            const loginResponse = await request(app.getHttpServer())
                .post('/api/admin/login')
                .send({
                    email: process.env.ADMIN_EMAIL,
                    password: process.env.ADMIN_PASS,
                    phone: process.env.ADMIN_PHONE,
                });

            const cookies = loginResponse.headers['set-cookie'];
            adminToken = cookies[0];
        });

        it('should verify admin authentication', () => {
            return request(app.getHttpServer())
                .get('/api/admin/is-admin')
                .set('Cookie', adminToken)
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.email).toBeDefined();
                });
        });

        it('should fail without admin token', () => {
            return request(app.getHttpServer())
                .get('/api/admin/is-admin')
                .expect(401);
        });
    });

    describe('/api/admin/logout (POST)', () => {
        it('should logout admin successfully', async () => {
            const loginResponse = await request(app.getHttpServer())
                .post('/api/admin/login')
                .send({
                    email: process.env.ADMIN_EMAIL,
                    password: process.env.ADMIN_PASS,
                    phone: process.env.ADMIN_PHONE,
                });

            const cookies = loginResponse.headers['set-cookie'];

            return request(app.getHttpServer())
                .post('/api/admin/logout')
                .set('Cookie', cookies[0])
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.message).toBe('Admin successfully logged out');
                });
        });
    });
});