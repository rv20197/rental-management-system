import request from 'supertest';
import app from '../../app';
import { Rental, Item, Customer, InventoryUnit } from '../../models';

describe('Rental Integration Tests', () => {
    let token: string;
    let customerId: number;
    let itemId: number;
    let rentalId: number;

    beforeAll(async () => {
        // 1. Register and Login to get token
        await request(app).post('/api/auth/register').send({
            name: 'Rental Test Admin',
            email: 'rental-test@example.com',
            password: 'password123',
            role: 'admin'
        });

        const loginRes = await request(app).post('/api/auth/login').send({
            email: 'rental-test@example.com',
            password: 'password123'
        });
        token = loginRes.body.token;

        // 2. Create customer
        const customerRes = await request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${token}`)
            .send({
                firstName: 'Rental',
                lastName: 'Tester',
                email: 'rental@example.com',
                phone: '1234567890'
            });
        customerId = customerRes.body.id;

        // 3. Create item
        const itemRes = await request(app)
            .post('/api/items')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Saw',
                category: 'Tools',
                quantity: 10,
                monthlyRate: 40,
                depositAmount: 80
            });
        itemId = itemRes.body.id;
    });

    test('POST /api/rentals - success', async () => {
        const res = await request(app)
            .post('/api/rentals')
            .set('Authorization', `Bearer ${token}`)
            .send({
                customerId,
                itemId,
                quantity: 3,
                startDate: new Date(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week later
                depositAmount: 80
            });

        if (res.status !== 201) {
            console.error('FAIL STATUS:', res.status);
            console.error('FAIL BODY:', JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.quantity).toBe(3);
        expect(res.body.inventoryUnitIds.length).toBe(3);
        rentalId = res.body.id;

        // Verify item quantity decreased
        const item = await Item.findByPk(itemId);
        expect(item?.quantity).toBe(7);

        // Verify inventory units are now rented
        const units = await InventoryUnit.findAll({ where: { id: res.body.inventoryUnitIds } });
        units.forEach(u => expect(u.status).toBe('rented'));
    });

    test('GET /api/rentals - success', async () => {
        const res = await request(app)
            .get('/api/rentals')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((r: any) => r.id === rentalId)).toBe(true);
    });

    test('GET /api/rentals/:id - success', async () => {
        const res = await request(app)
            .get(`/api/rentals/${rentalId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(rentalId);
    });

    test('POST /api/rentals - fail (not enough stock)', async () => {
        const res = await request(app)
            .post('/api/rentals')
            .set('Authorization', `Bearer ${token}`)
            .send({
                customerId,
                itemId,
                quantity: 10, // Only 7 left
                startDate: new Date(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                depositAmount: 80
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Insufficient inventory units/);
    });
});
