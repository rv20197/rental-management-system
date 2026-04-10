import { baseUrl } from "@/api";
import { getSessionToken } from "@/lib/browser";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { itemApi, type Item } from "./itemApi";
import type { Customer } from "./customerApi";

export interface RentalItem {
  id: number;
  rentalId: number;
  itemId: number;
  quantity: number;
  returnedQuantity: number;
  Item?: Item;
}

export interface Rental {
  id: number;
  itemId?: number;
  customerId: number;
  quantity?: number;
  returnedQuantity?: number;
  outstandingQty?: number;
  outstandingAmount?: number;
  baseAmount?: number;
  totalAmount?: number;
  inventoryUnitIds?: number[];
  startDate: string;
  endDate?: string;
  depositAmount?: number;
  labourCost?: number;
  transportCost?: number;
  status: "active" | "completed" | "cancelled";
  createdAt?: string;
  Item?: Item;
  RentalItems?: RentalItem[];
  Customer?: Customer;
}

export interface CreateRentalPayload {
  itemId?: number;
  customerId: number;
  quantity?: number;
  items?: { itemId: number; quantity: number }[];
  startDate: string;
  inventoryUnitIds?: number[];
  endDate?: string;
  depositAmount?: number;
  labourCost?: number;
  transportCost?: number;
  status?: "active" | "completed" | "cancelled";
}

export interface UpdateRentalPayload {
  status?: "active" | "completed" | "cancelled" | "pending" | "created";
  endDate?: string;
  items?: { itemId: number; quantity: number }[];
  depositAmount?: number;
  labourCost?: number;
  transportCost?: number;
}

export const rentalApi = createApi({
  reducerPath: "rentalApi",
  baseQuery: fetchBaseQuery({
    baseUrl: baseUrl,
    credentials: 'include',
    prepareHeaders: (headers) => {
      const token = getSessionToken();
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Rental", "Billing", "Item"],
  endpoints: (builder) => ({
    getRentals: builder.query<Rental[], { customerId?: number; status?: string } | void>({
      query: (params) => {
        if (!params) return "rentals";
        const queryParams = new URLSearchParams();
        if (params.customerId) queryParams.append("customerId", params.customerId.toString());
        if (params.status) queryParams.append("status", params.status);
        return `rentals?${queryParams.toString()}`;
      },
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
      invalidatesTags: ["Rental", "Billing", "Item"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(itemApi.util.invalidateTags(["Item"]));
        } catch {
          // Let the mutation error handling flow handle failures.
        }
      },
    }),
    updateRental: builder.mutation<Rental, { id: number; data: UpdateRentalPayload }>({
      query: ({ id, data }) => ({
        url: `rentals/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Rental", "Item"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(itemApi.util.invalidateTags(["Item"]));
        } catch {
          // Let the mutation error handling flow handle failures.
        }
      },
    }),
    deleteRental: builder.mutation<void, number>({
      query: (id) => ({
        url: `rentals/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Rental", "Item"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(itemApi.util.invalidateTags(["Item"]));
        } catch {
          // Let the mutation error handling flow handle failures.
        }
      },
    }),
    // delegate to billing endpoint to calculate return bill
    returnAndBill: builder.mutation<any, { rentalId: number; items: { rentalItemId: number; quantity: number }[] }>({
      query: (body) => ({
        url: "billings/return",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Rental", "Item", "Billing"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(itemApi.util.invalidateTags(["Item"]));
        } catch {
          // Let the mutation error handling flow handle failures.
        }
      },
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
