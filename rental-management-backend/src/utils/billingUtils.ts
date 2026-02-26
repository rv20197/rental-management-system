/**
 * Dynamically calculates the number of months to charge for a rental based on the return date.
 * 
 * New Billing Rules:
 * - Return before the 5th of the month: No charge for the current month (0).
 * - Return between the 5th and 15th of the month: Charge for 15 days (0.5).
 * - Return after the 15th of the month: Charge for the whole month (1.0).
 * 
 * For any full calendar month prior to the return month, a full month is charged (1.0).
 * 
 * @param startDate The date when the rental started.
 * @param returnDate The date when the items are being returned.
 * @returns Total months (decimal) to charge for the rental duration.
 */
export const calculateMonthsRented = (startDate: Date, returnDate: Date): number => {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  
  const returnYear = returnDate.getFullYear();
  const returnMonth = returnDate.getMonth();
  const returnDay = returnDate.getDate();

  // Calculate full months from start year/month to return year/month.
  // This effectively treats any month prior to the return month as a full month.
  let months = (returnYear - startYear) * 12 + (returnMonth - startMonth);
  
  // Rule for the return month (the "current month" in the prompt)
  let returnMonthCharge = 0;
  if (returnDay < 5) {
    returnMonthCharge = 0;
  } else if (returnDay <= 15) {
    returnMonthCharge = 0.5;
  } else {
    returnMonthCharge = 1;
  }
  
  const totalMonths = months + returnMonthCharge;
  
  // We ensure we don't return negative values if for some reason returnDate is before startDate (though controller handles this).
  return Math.max(0, totalMonths);
};
