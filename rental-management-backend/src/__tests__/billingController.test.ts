import { Request, Response } from 'express';
import { returnAndBill } from '../controllers/billingController';
import { Rental, Billing, RentalItem, BillingItem } from '../models';
import { InventoryUnit } from '../models/Item';
import { calculateMonthsRented } from '../utils/billingUtils';

// Mock all dependencies
jest.mock('../models', () => ({
    Rental: {
        findByPk: jest.fn(),
    },
    RentalItem: {
        findAll: jest.fn(),
    },
    Billing: {
        create: jest.fn(),
    },
    BillingItem: {
        create: jest.fn(),
    }
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
            body: { 
                rentalId: 'rental-1', 
                items: [{ rentalItemId: 1, quantity: 2 }] 
            },
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
            const mockRentalItem = {
                id: 1,
                itemId: 'item-1',
                quantity: 5,
                returnedQuantity: 0,
                inventoryUnitIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
                Item: mockItem,
                update: jest.fn(),
            };
            const mockRental = {
                id: 'rental-1',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(),
                RentalItems: [mockRentalItem],
                update: jest.fn(),
            };

            const mockBilling = {
                id: 'bill-1',
                update: jest.fn(),
            };

            (Rental.findByPk as jest.Mock).mockResolvedValue(mockRental);
            (Billing.create as jest.Mock).mockResolvedValue(mockBilling);
            (calculateMonthsRented as jest.Mock).mockReturnValue(1);
            (RentalItem.findAll as jest.Mock).mockResolvedValue([mockRentalItem]);

            await returnAndBill(req as Request, res as Response);

            expect(Billing.create).toHaveBeenCalledWith(expect.objectContaining({
                rentalId: 'rental-1',
                amount: 0,
            }));

            expect(mockBilling.update).toHaveBeenCalledWith({ amount: 200 }); // 2 (qty) * 100 (rate) * 1 (months)

            expect(mockRentalItem.update).toHaveBeenCalledWith({
                returnedQuantity: 2,
            });

            expect(mockItem.update).toHaveBeenCalledWith({ quantity: 12 });
            expect(InventoryUnit.update).toHaveBeenCalledWith(
                { status: 'available' },
                { where: { id: ['u1', 'u2'] } }
            );
            expect(statusMock).toHaveBeenCalledWith(201);
        });
    });
});
