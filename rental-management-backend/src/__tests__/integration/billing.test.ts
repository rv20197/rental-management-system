import request from 'supertest';
import app from '../../app';
import { Item, Customer, Rental, Billing, User } from '../../models';

describe('Billing Integration Tests', () => {
    let token: string;
    let customerId: number;
    let itemId: number;
    let rentalId: number;

    beforeAll(async () => {
        // 1. Register and Login to get token
        await request(app).post('/api/auth/register').send({
            name: 'Billing Test Admin',
            email: 'billing-test@example.com',
            password: 'password123',
            role: 'admin'
        });

        const loginRes = await request(app).post('/api/auth/login').send({
            email: 'billing-test@example.com',
            password: 'password123'
        });
        token = loginRes.body.token;

        // 2. Create customer
        const customerRes = await request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${token}`)
            .send({
                firstName: 'Test',
                lastName: 'Customer',
                email: 'cust@example.com',
                phone: '1234567890'
            });
        customerId = customerRes.body.id;

        // 3. Create item
        const itemRes = await request(app)
            .post('/api/items')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Hammer',
                category: 'Tools',
                quantity: 10,
                monthlyRate: 50,
                depositAmount: 100
            });
        itemId = itemRes.body.id;

        // 4. Create rental
        const rentalRes = await request(app)
            .post('/api/rentals')
            .set('Authorization', `Bearer ${token}`)
            .send({
                customerId,
                itemId,
                quantity: 5,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
                depositAmount: 100
            });
        rentalId = rentalRes.body.id;
    });

    test('POST /api/billing/return - success', async () => {
        const res = await request(app)
            .post('/api/billings/return')
            .set('Authorization', `Bearer ${token}`)
            .send({
                rentalId,
                returnedQuantity: 2
            });
        if (res.status !== 201) {
            console.error('FAIL STATUS:', res.status);
            console.error('FAIL BODY:', JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('billing');
        expect(res.body.billing.amount).toBeDefined();
        expect(res.body.billing.returnedQuantity).toBe(2);

        // Verify rental quantity decreased
        const rental = await Rental.findByPk(rentalId);
        expect(rental?.quantity).toBe(3);

        // Verify item quantity increased
        const item = await Item.findByPk(itemId);
        expect(item?.quantity).toBe(7); // Started at 10, 5 rented (5 left), 2 returned (7 left)
    });

    test('POST /api/billings/return - fail (not found)', async () => {
        const res = await request(app)
            .post('/api/billings/return')
            .set('Authorization', `Bearer ${token}`)
            .send({
                rentalId: 9999,
                returnedQuantity: 1
            });

        expect(res.status).toBe(404);
    });
});
