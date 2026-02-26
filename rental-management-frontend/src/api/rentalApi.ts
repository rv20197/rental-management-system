import { baseUrl } from "@/api";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Item } from "./itemApi";
import type { Customer } from "./customerApi";

export interface Rental {
  id: number;
  itemId: number;
  customerId: number;
  quantity: number;
  returnedQuantity?: number;
  inventoryUnitIds?: number[];
  startDate: string;
  endDate?: string;
  depositAmount?: number;
  status: "active" | "completed" | "cancelled";
  createdAt?: string;
  Item?: Item;
  Customer?: Customer;
}

export interface CreateRentalPayload {
  itemId: number;
  customerId: number;
  quantity: number;
  startDate: string;
  inventoryUnitIds?: number[];
  endDate?: string;
  depositAmount?: number;
  status?: "active" | "completed" | "cancelled";
}

export interface UpdateRentalPayload {
  status?: "active" | "completed" | "cancelled";
  endDate?: string;
}

export const rentalApi = createApi({
  reducerPath: "rentalApi",
  baseQuery: fetchBaseQuery({
    baseUrl: baseUrl,
    credentials: 'include',
    prepareHeaders: (headers) => {
      const token = sessionStorage.getItem("token");
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Rental", "Billing"],
  endpoints: (builder) => ({
    getRentals: builder.query<Rental[], void>({
      query: () => "rentals",
      providesTags: ["Rental"],
    }),
    getRental: builder.query<Rental, number>({
      query: (id) => `rentals/${id}`,
      providesTags: (_, __, id) => [{ type: "Rental", id }],
    }),
    createRental: builder.mutation<Rental, CreateRentalPayload>({
      query: (body) => ({
        url: "rentals",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Rental", "Billing"],
    }),
    updateRental: builder.mutation<Rental, { id: number; data: UpdateRentalPayload }>({
      query: ({ id, data }) => ({
        url: `rentals/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Rental"],
    }),
    deleteRental: builder.mutation<void, number>({
      query: (id) => ({
        url: `rentals/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Rental"],
    }),
    // delegate to billing endpoint to calculate return bill
    returnAndBill: builder.mutation<any, { rentalId: number; returnedQuantity: number }>({
      query: (body) => ({
        url: "billings/return",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Rental"],
    }),
  }),
});

export const {
  useGetRentalsQuery,
  useGetRentalQuery,
  useCreateRentalMutation,
  useUpdateRentalMutation,
  useDeleteRentalMutation,
  useReturnAndBillMutation,
} = rentalApi;
