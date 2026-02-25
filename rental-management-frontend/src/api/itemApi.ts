import { baseUrl } from "@/api";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Item {
  id: number;
  name: string;
  description?: string;
  category?: string;
  status: "available" | "rented" | "maintenance";
  monthlyRate: number;
  quantity: number;
}

export interface CreateItemPayload {
  name: string;
  description?: string;
  category?: string;
  status?: "available" | "rented" | "maintenance";
  monthlyRate: number;
  quantity: number;
}

export interface UpdateItemPayload {
  status?: "available" | "rented" | "maintenance";
  monthlyRate?: number;
  quantity?: number;
}

export const itemApi = createApi({
  reducerPath: "itemApi",
  baseQuery: fetchBaseQuery({
    baseUrl: baseUrl,
    credentials: 'include',
    prepareHeaders: (headers) => {
      const token = sessionStorage.getItem("token");
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Item"],
  endpoints: (builder) => ({
    getItems: builder.query<Item[], void>({
      query: () => "items",
      providesTags: ["Item"],
    }),
    getItem: builder.query<Item, number>({
      query: (id) => `items/${id}`,
      providesTags: (_, __, id) => [{ type: "Item", id }],
    }),
    createItem: builder.mutation<Item, CreateItemPayload>({
      query: (body) => ({
        url: "items",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Item"],
    }),
    updateItem: builder.mutation<Item, { id: number; data: UpdateItemPayload }>({
      query: ({ id, data }) => ({
        url: `items/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Item", id }],
    }),
    deleteItem: builder.mutation<void, number>({
      query: (id) => ({
        url: `items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Item"],
    }),
  }),
});

export const {
  useGetItemsQuery,
  useGetItemQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
} = itemApi;
