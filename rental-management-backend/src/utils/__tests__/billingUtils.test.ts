import { calculateMonthsRented } from '../billingUtils';

describe('billingUtils', () => {
  describe('calculateMonthsRented', () => {
    test('return before 7 days post due: base duration + 0 charge for overdue period', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-01-16'); // 15 days duration
      const returnDate = new Date('2024-01-21'); // 5 days post
      // base = 15/30 = 0.5
      // overdue = 0
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(0.5);
    });

    test('return between 7th and 15th post due: base duration + 0.5 charge for overdue period', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-01-16'); // 15 days duration
      const returnDate = new Date('2024-01-26'); // 10 days post
      // base = 0.5, overdue = 0.5
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(1.0);
    });

    test('return after 15th post due: base duration + 1.0 charge for overdue period', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-01-16'); // 15 days duration
      const returnDate = new Date('2024-02-02'); // 17 days post
      // base = 0.5, overdue = 1.0
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(1.5);
    });

    test('multi-month rental: full months + overdue rule (before 7 days post)', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-03-01');
      const returnDate = new Date('2024-03-05'); // 4 days post
      // base days = 60 (Jan: 31, Feb: 29 in 2024)
      // 60 / 30 = 2.0
      // overdue = 0
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(2);
    });

    test('multi-month rental: full months + overdue rule (7th-15th post)', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-03-01');
      const returnDate = new Date('2024-03-10'); // 9 days post
      // base = 2.0, overdue = 0.5
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(2.5);
    });

    test('multi-month rental: full months + overdue rule (after 15th post)', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2024-03-01');
      const returnDate = new Date('2024-03-20'); // 19 days post
      // base = 2.0, overdue = 1.0
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(3);
    });

    test('year boundary: Jan 2024 to Jan 2025 (before 7 days post)', () => {
      const startDate = new Date('2024-01-01');
      const dueDate = new Date('2025-01-01'); // 366 days (leap year)
      const returnDate = new Date('2025-01-04');
      // base = 366 / 30 = 12.2
      // overdue = 0
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(12.2);
    });

    test('start date not at 1st of month: accurate day-based calculation', () => {
      const startDate = new Date('2024-01-15');
      const dueDate = new Date('2024-02-14'); // 30 days
      const returnDate = new Date('2024-03-05'); // overdue
      // base = 30 / 30 = 1.0
      // diff = Mar 5 - Feb 14 = 15+5 = 20 days. overdue = 1.0
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(2.0);
    });

    test('return date before start date: returns 0', () => {
      const startDate = new Date('2024-02-01');
      const dueDate = new Date('2024-02-15');
      const returnDate = new Date('2024-01-01');
      expect(calculateMonthsRented(startDate, returnDate, dueDate)).toBe(0);
    });
  });
});
