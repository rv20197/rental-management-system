import { calculateMonthsRented } from '../billingUtils';

describe('billingUtils', () => {
  describe('calculateMonthsRented', () => {
    test('return before 5th: 0 charge for current month', () => {
      const startDate = new Date('2024-01-01');
      const returnDate = new Date('2024-01-04');
      expect(calculateMonthsRented(startDate, returnDate)).toBe(0);
    });

    test('return between 5th and 15th: 0.5 charge for current month', () => {
      const startDate = new Date('2024-01-01');
      const returnDate = new Date('2024-01-10');
      expect(calculateMonthsRented(startDate, returnDate)).toBe(0.5);
    });

    test('return after 15th: 1.0 charge for current month', () => {
      const startDate = new Date('2024-01-01');
      const returnDate = new Date('2024-01-20');
      expect(calculateMonthsRented(startDate, returnDate)).toBe(1);
    });

    test('multi-month rental: full months + return month rule (before 5th)', () => {
      const startDate = new Date('2024-01-01');
      const returnDate = new Date('2024-03-04');
      // Jan (1) + Feb (1) + Mar (0) = 2
      expect(calculateMonthsRented(startDate, returnDate)).toBe(2);
    });

    test('multi-month rental: full months + return month rule (5th-15th)', () => {
      const startDate = new Date('2024-01-01');
      const returnDate = new Date('2024-03-10');
      // Jan (1) + Feb (1) + Mar (0.5) = 2.5
      expect(calculateMonthsRented(startDate, returnDate)).toBe(2.5);
    });

    test('multi-month rental: full months + return month rule (after 15th)', () => {
      const startDate = new Date('2024-01-01');
      const returnDate = new Date('2024-03-20');
      // Jan (1) + Feb (1) + Mar (1) = 3
      expect(calculateMonthsRented(startDate, returnDate)).toBe(3);
    });

    test('year boundary: Jan 2024 to Jan 2025 (before 5th)', () => {
      const startDate = new Date('2024-01-01');
      const returnDate = new Date('2025-01-04');
      // 12 months in 2024 + 0 in Jan 2025 = 12
      expect(calculateMonthsRented(startDate, returnDate)).toBe(12);
    });

    test('start date not at 1st of month: should still count as full months for prior months', () => {
      // Logic says: (returnYear - startYear) * 12 + (returnMonth - startMonth)
      // If start is Jan 15 and return is Feb 20:
      // months = (0) * 12 + (1 - 0) = 1
      // returnDay = 20 -> returnMonthCharge = 1
      // total = 2
      const startDate = new Date('2024-01-15');
      const returnDate = new Date('2024-02-20');
      expect(calculateMonthsRented(startDate, returnDate)).toBe(2);
    });

    test('return date before start date: returns 0', () => {
      const startDate = new Date('2024-02-01');
      const returnDate = new Date('2024-01-01');
      expect(calculateMonthsRented(startDate, returnDate)).toBe(0);
    });
  });
});
