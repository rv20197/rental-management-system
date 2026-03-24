/**
 * Dynamically calculates the number of months to charge for a rental based on the return date and due date.
 * 
 * New Billing Rules:
 * - Return within 7 days post due date: No charge for that period (0).
 * - Return between 7 to 15 days post due date: Charge for half month (0.5).
 * - Return after 15 days post due date: Charge for full month (1.0).
 * 
 * For any full calendar month prior to the due date month, a full month is charged (1.0).
 * 
 * @param startDate The date when the rental started.
 * @param returnDate The date when the items are being returned.
 * @param dueDate The date when the rental was due to be returned.
 * @returns Total months (decimal) to charge for the rental duration.
 */
export const calculateMonthsRented = (startDate: Date, returnDate: Date, dueDate: Date): number => {
  if (returnDate < startDate) return 0;

  // Base duration: days between start date and due date
  const baseTime = dueDate.getTime() - startDate.getTime();
  const baseDays = baseTime / (1000 * 60 * 60 * 24);
  const baseMonths = baseDays / 30;

  // Overdue calculation: days between return date and due date
  const diffTime = returnDate.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let overdueCharge = 0;
  if (diffDays <= 7) {
    overdueCharge = 0;
  } else if (diffDays <= 15) {
    overdueCharge = 0.5;
  } else if (diffDays > 15) {
    overdueCharge = 1;
  }

  const totalMonths = baseMonths + overdueCharge;
  
  // Return rounded to 1 decimal place for consistency with display and accuracy
  return Math.max(0, Math.round(totalMonths * 10) / 10);
};
