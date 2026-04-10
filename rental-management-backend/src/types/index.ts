export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
}

export interface Item {
  id: number;
  name: string;
  category: string;
  monthlyRate: number;
  quantity: number;
  description?: string;
}

export interface Rental {
  id: number;
  customerId: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'returned' | 'cancelled';
  depositAmount: number;
  totalAmount?: number;
  Customer?: Customer;
  RentalItems?: RentalItem[];
}

export interface RentalItem {
  id: number;
  rentalId: number;
  itemId: number;
  quantity: number;
  returnedQuantity: number;
  Item?: Item;
}

export interface Billing {
  id: number;
  rentalId?: number;
  customerId?: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  createdAt?: string;
  totalDamages?: number;
  depositUsed?: number;
  availableDeposit?: number;
  labourCost?: number;
  transportCost?: number;
  returnedQuantity?: number | null;
  depositAmount?: number;
  Rental?: Rental;
  Customer?: Customer;
  BillingItems?: BillingItem[];
  BillingDamages?: BillingDamage[];
}

export interface BillingItem {
  id: number;
  billingId: number;
  itemId: number | null;
  quantity: number;
  rate: number;
  total: number;
  description?: string;
  Item?: Item;
}

export interface BillingDamage {
  id: number;
  billingId: number;
  description: string;
  amount: number;
}
