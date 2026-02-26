import request from 'supertest';
import app from '../../app';
import { Item, InventoryUnit } from '../../models';

describe('Item Integration Tests', () => {
    let token: string;
    let itemId: number;

    beforeAll(async () => {
        // Register and Login to get token
        await request(app).post('/api/auth/register').send({
            name: 'Item Test Admin',
            email: 'item-test@example.com',
            password: 'password123',
            role: 'admin'
        });

        const loginRes = await request(app).post('/api/auth/login').send({
            email: 'item-test@example.com',
            password: 'password123'
        });
        token = loginRes.body.token;
    });

    test('POST /api/items - success', async () => {
        const res = await request(app)
            .post('/api/items')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Drill',
                category: 'Tools',
                quantity: 5,
                monthlyRate: 35,
                depositAmount: 50
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Drill');
        itemId = res.body.id;

        // Verify Inventory Units were created
        const units = await InventoryUnit.findAll({ where: { itemId } });
        expect(units.length).toBe(5);
    });

    test('GET /api/items - success', async () => {
        const res = await request(app)
            .get('/api/items')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((i: any) => i.id === itemId)).toBe(true);
    });

    test('GET /api/items/:id - success', async () => {
        const res = await request(app)
            .get(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Drill');
    });

    test('PUT /api/items/:id - success (increase quantity)', async () => {
        const res = await request(app)
            .put(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                quantity: 8 // Add 3 more units
            });

        expect(res.status).toBe(200);
        expect(res.body.quantity).toBe(8);

        // Verify Inventory Units increased to 8
        const units = await InventoryUnit.findAll({ where: { itemId } });
        expect(units.length).toBe(8);
    });

    test('DELETE /api/items/:id - success', async () => {
        const res = await request(app)
            .delete(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Item deleted successfully');

        // Verify retrieval fails
        const findRes = await request(app)
            .get(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(findRes.status).toBe(404);
    });
});
