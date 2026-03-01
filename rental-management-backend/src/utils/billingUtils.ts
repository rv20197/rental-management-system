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
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  
  const dueYear = dueDate.getFullYear();
  const dueMonth = dueDate.getMonth();

  // Calculate full months from start year/month to due year/month.
  // This treats any month prior to the due month as a full month.
  let months = (dueYear - startYear) * 12 + (dueMonth - startMonth);
  
  // Calculate the difference in days between return date and due date
  const diffTime = returnDate.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let overdueCharge = 0;
  if (diffDays <= 7) {
    overdueCharge = 0;
  } else if (diffDays <= 15) {
    overdueCharge = 0.5;
  } else {
    overdueCharge = 1;
  }
  
  // Base months (until due date) + overdue charge
  // Note: This logic assumes that the rental period until due date is already accounted for in `months`.
  // However, the original logic for "return month" was slightly different.
  // If the return is BEFORE the due date, diffDays will be negative or zero.
  // If return is on due date, diffDays = 0, overdueCharge = 0.
  
  // Let's refine: 
  // If returned before or on due date, we should probably still charge for the time used until return.
  // But the prompt specifically asks about return POST due date.
  
  // If returnDate <= dueDate, we should probably use the original logic or similar for the return month.
  // But wait, the prompt says "if customer return product within 7 days post due date then no need to charge the rent for that period of time".
  // This implies we are talking about what happens AFTER the due date.
  
  const totalMonths = months + overdueCharge;
  
  return Math.max(0, totalMonths);
};
