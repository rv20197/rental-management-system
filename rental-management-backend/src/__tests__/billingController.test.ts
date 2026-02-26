import { Request, Response } from 'express';
import { returnAndBill } from '../controllers/billingController';
import { Rental, Billing } from '../models';
import { InventoryUnit } from '../models/Item';
import { calculateMonthsRented } from '../utils/billingUtils';

// Mock all dependencies
jest.mock('../models', () => ({
    Rental: {
        findByPk: jest.fn(),
    },
    Billing: {
        create: jest.fn(),
    },
}));

jest.mock('../models/Item', () => ({
    Item: {
        update: jest.fn(),
    },
    InventoryUnit: {
        update: jest.fn(),
    },
}));

jest.mock('../utils/billingUtils', () => ({
    calculateMonthsRented: jest.fn(),
}));

describe('billingController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        req = {
            body: { rentalId: 'rental-1', returnedQuantity: 2 },
        };
        res = {
            status: statusMock,
            json: jsonMock,
        };
        jest.clearAllMocks();
    });

    describe('returnAndBill', () => {
        test('should return 404 if rental not found', async () => {
            (Rental.findByPk as jest.Mock).mockResolvedValue(null);

            await returnAndBill(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Rental not found' });
        });

        test('should generate bill and update inventory on success', async () => {
            const mockItem = {
                id: 'item-1',
                quantity: 10,
                monthlyRate: '100',
                update: jest.fn(),
            };
            const mockRental = {
                id: 'rental-1',
                quantity: 5,
                status: 'active',
                startDate: new Date(),
                inventoryUnitIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
                Item: mockItem,
                update: jest.fn(),
            };

            (Rental.findByPk as jest.Mock).mockResolvedValue(mockRental);
            (Billing.create as jest.Mock).mockResolvedValue({ id: 'bill-1' });
            (calculateMonthsRented as jest.Mock).mockReturnValue(1);

            await returnAndBill(req as Request, res as Response);

            expect(Billing.create).toHaveBeenCalledWith(expect.objectContaining({
                rentalId: 'rental-1',
                amount: 200, // 2 (qty) * 100 (rate) * 1 (months)
                returnedQuantity: 2,
                returnedUnitIds: ['u1', 'u2'],
            }));

            expect(mockRental.update).toHaveBeenCalledWith(expect.objectContaining({
                quantity: 3,
                status: 'active',
            }));

            expect(mockItem.update).toHaveBeenCalledWith({ quantity: 12 });
            expect(InventoryUnit.update).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(201);
        });
    });
});
