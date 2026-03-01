import { calculateMonthsRented } from '../billingUtils';

describe('billingUtils', () => {
  describe('calculateMonthsRented', () => {
    test('return before 7 days post due: 0 charge for overdue period', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-01-15');
      const returnDate = new Date('2024-01-20'); // 5 days post
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(0);
    });

    test('return between 7th and 15th post due: 0.5 charge for overdue period', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-01-15');
      const returnDate = new Date('2024-01-25'); // 10 days post
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(0.5);
    });

    test('return after 15th post due: 1.0 charge for overdue period', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-01-15');
      const returnDate = new Date('2024-02-01'); // 17 days post
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(1);
    });

    test('multi-month rental: full months + overdue rule (before 7 days post)', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-03-01');
      const returnDate = new Date('2024-03-05'); // 4 days post
      // months = (2) * 12 + (2 - 0) = 2
      // overdue = 0
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(2);
    });

    test('multi-month rental: full months + overdue rule (7th-15th post)', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-03-01');
      const returnDate = new Date('2024-03-10'); // 9 days post
      // months = 2
      // overdue = 0.5
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(2.5);
    });

    test('multi-month rental: full months + overdue rule (after 15th post)', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-03-01');
      const returnDate = new Date('2024-03-20'); // 19 days post
      // months = 2
      // overdue = 1
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(3);
    });

    test('year boundary: Jan 2024 to Jan 2025 (before 7 days post)', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2025-01-01');
      const returnDate = new Date('2025-01-04');
      // months = 12
      // overdue = 0
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(12);
    });

    test('start date not at 1st of month: should still count as full months for prior months', () => {
      const startDate = new Date('2024-01-15');
      const dueDate = new Date('2024-02-15');
      const returnDate = new Date('2024-03-05'); // 19 days post
      // months = (0) * 12 + (1 - 0) = 1
      // overdue (19 days) = 1
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(2);
    });

    test('return date before start date: returns 0', () => {
      const startDate = new Date('2024-02-01');
      const dueDate = new Date('2024-02-15');
      const returnDate = new Date('2024-01-01');
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(0);
    });
  });
});
