import { calculateMonthsRented } from '../utils/billingUtils';

describe('billingUtils', () => {
    describe('calculateMonthsRented', () => {
        test('should charge 0 for overdue if returned within 7 days post due date', () => {
            const start = new Date(2023, 0, 1); // Jan 1st
            const due = new Date(2023, 0, 15); // Jan 15th
            const returnDate = new Date(2023, 0, 20); // Jan 20th (5 days post)
            // months until due month = (2023-2023)*12 + (0-0) = 0
            // overdue = 5 days <= 7 -> 0
            expect(calculateMonthsRented(start, returnDate, due)).toBe(0);
        });

        test('should charge 0.5 for overdue if returned between 7 and 15 days post due date', () => {
            const start = new Date(2023, 0, 1);
            const due = new Date(2023, 0, 15);
            const returnDate = new Date(2023, 0, 25); // Jan 25th (10 days post)
            // overdue = 10 days -> 0.5
            expect(calculateMonthsRented(start, returnDate, due)).toBe(0.5);
        });

        test('should charge 1.0 for overdue if returned after 15 days post due date', () => {
            const start = new Date(2023, 0, 1);
            const due = new Date(2023, 0, 15);
            const returnDate = new Date(2023, 1, 1); // Feb 1st (17 days post)
            // overdue = 17 days -> 1.0
            expect(calculateMonthsRented(start, returnDate, due)).toBe(1);
        });

        test('should include full months until due date', () => {
            const start = new Date(2023, 0, 1); // Jan 1st
            const due = new Date(2023, 2, 1); // March 1st
            const returnDate = new Date(2023, 2, 5); // March 5th (4 days post)
            // months until due = (2023-2023)*12 + (2-0) = 2
            // overdue = 4 days -> 0
            expect(calculateMonthsRented(start, returnDate, due)).toBe(2);
        });

        test('should handle year boundaries correctly', () => {
            const start = new Date(2022, 11, 1); // Dec 1, 2022
            const due = new Date(2023, 0, 1); // Jan 1, 2023
            const returnDate = new Date(2023, 0, 20); // Jan 20, 2023 (19 days post)
            // months until due = (2023-2022)*12 + (0-11) = 12 - 11 = 1
            // overdue = 19 days -> 1.0
            expect(calculateMonthsRented(start, returnDate, due)).toBe(2);
        });
    });
});
