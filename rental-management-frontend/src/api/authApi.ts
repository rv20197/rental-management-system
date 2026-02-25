import { baseUrl } from "@/api";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "manager";
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${baseUrl}/auth`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    register: builder.mutation<void, RegisterPayload>({
      query: (body) => ({
        url: "register",
        method: "POST",
        body,
      }),
    }),
    login: builder.mutation<LoginResponse, LoginPayload>({
      query: (body) => ({
        url: "login",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation } = authApi;
