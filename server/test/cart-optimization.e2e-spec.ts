import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as jwt from 'jsonwebtoken';

describe('Cart Optimization API (e2e)', () => {
    let app: INestApplication;
    let connection: Connection;
    let authToken: string;
    let testUserId: string;
    let testProductId1: string;
    let testProductId2: string;

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

        // ─── Setup: crear usuario de prueba ────────────────────
        const registerRes = await request(app.getHttpServer())
            .post('/api/user/register')
            .send({
                name: 'Test Optimizer',
                email: 'test-optimizer@example.com',
                password: 'password123',
                phone: '+1234567890',
            });

        // Extraer token de la cookie
        const cookies = registerRes.headers['set-cookie'];
        const tokenCookie = cookies?.find((c: string) => c.startsWith('token='));
        authToken = tokenCookie?.split(';')[0]?.replace('token=', '') || '';

        // Si no hay cookie, generar token directamente
        if (!authToken) {
            if (!registerRes.body?.user?._id) {
                throw new Error('Registration did not return user ID and no auth cookie was set');
            }

            testUserId = registerRes.body.user._id;
            const jwtSecret = process.env.JWT_SECRET || 'test-secret';
            authToken = jwt.sign({ id: testUserId }, jwtSecret, { expiresIn: '1h' });
        }

        // Obtener el token del header Authorization también
        if (!authToken && registerRes.body?.user?._id) {
            testUserId = registerRes.body.user._id;
            const jwtSecret = process.env.JWT_SECRET || 'test-secret';
            authToken = jwt.sign({ id: testUserId }, jwtSecret, { expiresIn: '1h' });
        }

        // ─── Setup: crear productos de prueba ──────────────────
        // Nota: esto requiere que el usuario sea admin o que existan productos
        // En un entorno real, estos productos ya existirían
    });

    afterAll(async () => {
        // Limpiar datos de test
        if (testUserId) {
            await connection.collection('users').deleteMany({
                email: 'test-optimizer@example.com',
            });
        }
        // No eliminamos productos de prueba ya que podrían ser compartidos
        await app.close();
    });

    describe('POST /api/cart/optimize', () => {

        it('debe retornar 401 sin autenticación', () => {
            return request(app.getHttpServer())
                .post('/api/cart/optimize')
                .expect(401);
        });

        it('debe retornar estructura válida con carrito vacío', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/cart/optimize')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('suggestions');
            expect(res.body).toHaveProperty('totalIfAllBuy');
            expect(res.body).toHaveProperty('totalOptimized');
            expect(res.body).toHaveProperty('estimatedSavings');
            expect(res.body).toHaveProperty('loanFeeEstimate');
            expect(Array.isArray(res.body.suggestions)).toBe(true);
        });

        it('debe retornar sugerencias cuando el carrito tiene items', async () => {
            // Primero agregar items al carrito
            if (testProductId1) {
                await request(app.getHttpServer())
                    .post('/api/cart/add')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ itemId: testProductId1 });
            }

            const res = await request(app.getHttpServer())
                .post('/api/cart/optimize')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.suggestions).toBeDefined();

            if (res.body.suggestions.length > 0) {
                const suggestion = res.body.suggestions[0];
                expect(suggestion).toHaveProperty('productId');
                expect(suggestion).toHaveProperty('title');
                expect(suggestion).toHaveProperty('price');
                expect(suggestion).toHaveProperty('quantity');
                expect(suggestion).toHaveProperty('suggestion');
                expect(['buy', 'loan']).toContain(suggestion.suggestion);
            }
        });

        it('debe tener ahorro >= 0', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/cart/optimize')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body.estimatedSavings).toBeGreaterThanOrEqual(0);
        });

        it('debe tener totalOptimized <= totalIfAllBuy', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/cart/optimize')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body.totalOptimized).toBeLessThanOrEqual(res.body.totalIfAllBuy);
        });
    });

    describe('POST /api/cart/optimize/accept', () => {

        it('debe retornar 401 sin autenticación', () => {
            return request(app.getHttpServer())
                .post('/api/cart/optimize/accept')
                .send({ acceptedSuggestions: [] })
                .expect(401);
        });

        it('debe procesar aceptación vacía', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/cart/optimize/accept')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ acceptedSuggestions: [] })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.reservations).toHaveLength(0);
            expect(res.body.purchases).toHaveLength(0);
        });
    });
});
