import request from 'supertest';
import app from '../../app';
import { Customer } from '../../models';

describe('Customer Integration Tests', () => {
    let token: string;
    let customerId: number;

    beforeAll(async () => {
        // Register and Login to get token
        await request(app).post('/api/auth/register').send({
            name: 'Customer Test Admin',
            email: 'customer-test@example.com',
            password: 'password123',
            role: 'admin'
        });

        const loginRes = await request(app).post('/api/auth/login').send({
            email: 'customer-test@example.com',
            password: 'password123'
        });
        token = loginRes.body.token;
    });

    test('POST /api/customers - success', async () => {
        const res = await request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${token}`)
            .send({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '555-1234',
                address: '123 Main St'
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.firstName).toBe('John');
        customerId = res.body.id;
    });

    test('GET /api/customers - success', async () => {
        const res = await request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET /api/customers/:id - success', async () => {
        const res = await request(app)
            .get(`/api/customers/${customerId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.firstName).toBe('John');
    });

    test('PUT /api/customers/:id - success', async () => {
        const res = await request(app)
            .put(`/api/customers/${customerId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                phone: '555-9999'
            });

        expect(res.status).toBe(200);
        expect(res.body.phone).toBe('555-9999');
    });

    test('DELETE /api/customers/:id - success', async () => {
        const res = await request(app)
            .delete(`/api/customers/${customerId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Customer deleted successfully');

        // Verify retrieval fails
        const findRes = await request(app)
            .get(`/api/customers/${customerId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(findRes.status).toBe(404);
    });
});
