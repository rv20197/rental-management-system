/**
 * Dynamically calculates the number of months to charge for a rental based on the return date.
 * Matches backend logic.
 */
export const calculateMonthsRented = (startDate: Date, returnDate: Date): number => {
  if (returnDate < startDate) return 0;
  const diffTime = returnDate.getTime() - startDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const months = diffDays / 30;
  return Math.max(0, Math.round(months * 10) / 10);
};
