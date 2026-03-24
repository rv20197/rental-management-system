/**
 * Centralized utility for rental-related calculations on the frontend.
 */

/**
 * Calculates the default security deposit amount.
 * Rule: Default deposit = 2 months' rent.
 * 
 * @param monthlyRate - The monthly rent rate for the item.
 * @param quantity - The number of units being rented.
 * @returns The calculated deposit amount.
 */
export const calculateDefaultDeposit = (monthlyRate: number, quantity: number): number => {
  return (monthlyRate || 0) * 2 * (quantity || 0);
};
