/**
 * Dynamically calculates the number of months to charge for a rental based on the return date.
 * Matches backend logic.
 */
export const calculateMonthsRented = (startDate: Date, returnDate: Date): number => {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  
  const returnYear = returnDate.getFullYear();
  const returnMonth = returnDate.getMonth();
  const returnDay = returnDate.getDate();

  // Calculate full months from start year/month to return year/month.
  let months = (returnYear - startYear) * 12 + (returnMonth - startMonth);
  
  // Rule for the return month
  let returnMonthCharge = 0;
  if (returnDay < 5) {
    returnMonthCharge = 0;
  } else if (returnDay <= 15) {
    returnMonthCharge = 0.5;
  } else {
    returnMonthCharge = 1;
  }
  
  const totalMonths = months + returnMonthCharge;
  
  return Math.max(0, totalMonths);
};
