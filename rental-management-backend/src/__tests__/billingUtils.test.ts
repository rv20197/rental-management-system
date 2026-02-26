import { calculateMonthsRented } from '../utils/billingUtils';

describe('billingUtils', () => {
    describe('calculateMonthsRented', () => {
        test('should charge 0 for current month if returned before 5th', () => {
            const start = new Date(2023, 0, 1); // Jan 1st
            const returnDate = new Date(2023, 0, 4); // Jan 4th
            expect(calculateMonthsRented(start, returnDate)).toBe(0);
        });

        test('should charge 0.5 for current month if returned between 5th and 15th', () => {
            const start = new Date(2023, 0, 1);
            const returnDate = new Date(2023, 0, 10); // Jan 10th
            expect(calculateMonthsRented(start, returnDate)).toBe(0.5);
        });

        test('should charge 1.0 for current month if returned after 15th', () => {
            const start = new Date(2023, 0, 1);
            const returnDate = new Date(2023, 0, 20); // Jan 20th
            expect(calculateMonthsRented(start, returnDate)).toBe(1);
        });

        test('should include full months for duration covering multiple months', () => {
            const start = new Date(2023, 0, 1); // Jan 1st
            const returnDate = new Date(2023, 2, 10); // March 10th
            // Jan (full) = 1, Feb (full) = 1, March (partial 5-15) = 0.5
            // Wait, the logic is: months = (2-0) * 12 + (2-0) = 2. returnCharge = 0.5. Total = 2.5
            expect(calculateMonthsRented(start, returnDate)).toBe(2.5);
        });

        test('should handle year boundaries correctly', () => {
            const start = new Date(2022, 11, 1); // Dec 1, 2022
            const returnDate = new Date(2023, 0, 20); // Jan 20, 2023
            // Dec (full) = 1, Jan (full) = 1
            // months = (2023-2022)*12 + (0-11) = 12 - 11 = 1. returnCharge (Jan 20) = 1. Total = 2.
            expect(calculateMonthsRented(start, returnDate)).toBe(2);
        });
    });
});
