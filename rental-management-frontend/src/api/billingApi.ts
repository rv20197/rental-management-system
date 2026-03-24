import { baseUrl } from "@/api";
import { getSessionToken } from "@/lib/browser";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type { Rental } from "./rentalApi";

export interface BillingItem {
  id: number;
  billingId: number;
  itemId: number;
  quantity: number;
  rate: number;
  total: number;
  Item?: any;
}

export interface BillingDamage {
  id: number;
  billingId: number;
  description: string;
  amount: number;
}

export interface Billing {
  id: number;
  rentalId?: number;
  customerId?: number;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  createdAt?: string;
  totalDamages?: number;
  depositUsed?: number;
  availableDeposit?: number;
  Rental?: Rental;
  Customer?: any;
  BillingItems?: BillingItem[];
  BillingDamages?: BillingDamage[];
}

export interface CreateBillingPayload {
  rentalId?: number;
  customerId?: number;
  amount: number;
  dueDate: string;
  status?: "pending" | "paid" | "overdue";
  items?: Partial<BillingItem>[];
  damages?: Partial<BillingDamage>[];
  availableDeposit?: number;
}

export interface ReturnBillingPayload {
  rentalId: number;
  returnedQuantity: number;
}

export const billingApi = createApi({
  reducerPath: "billingApi",
  baseQuery: fetchBaseQuery({
    baseUrl: baseUrl,
    credentials: 'include',
    prepareHeaders: (headers) => {
      const token = getSessionToken();
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Billing"],
  endpoints: (builder) => ({
    getBillings: builder.query<Billing[], void>({
      query: () => "billings",
      providesTags: ["Billing"],
    }),
    getBilling: builder.query<Billing, number>({
      query: (id) => `billings/${id}`,
      providesTags: (_, __, id) => [{ type: "Billing", id }],
    }),
    createBilling: builder.mutation<Billing, CreateBillingPayload>({
      query: (body) => ({
        url: "billings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Billing"],
    }),
    deleteBilling: builder.mutation<void, number>({
      query: (id) => ({
        url: `billings/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Billing"],
    }),
    payBilling: builder.mutation<Billing, number>({
      query: (id) => ({
        url: `billings/${id}/pay`,
        method: "PUT",
      }),
      invalidatesTags: ["Billing"],
    }),
    returnAndBill: builder.mutation<Billing, ReturnBillingPayload>({
      query: (body) => ({
        url: "billings/return",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Billing"],
    }),
  }),
});

export const {
  useGetBillingsQuery,
  useGetBillingQuery,
  useCreateBillingMutation,
  useDeleteBillingMutation,
  usePayBillingMutation,
  useReturnAndBillMutation,
} = billingApi;
