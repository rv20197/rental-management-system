import { baseUrl } from "@/api";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type { Rental } from "./rentalApi";

export interface Billing {
  id: number;
  rentalId: number;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  createdAt?: string;
  Rental?: Rental;
}

export interface CreateBillingPayload {
  rentalId: number;
  amount: number;
  dueDate: string;
  status?: "pending" | "paid" | "overdue";
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
      const token = sessionStorage.getItem("token");
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
