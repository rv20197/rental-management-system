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

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
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
    forgotPassword: builder.mutation<{ message: string }, ForgotPasswordPayload>({
      query: (body) => ({
        url: "forgot-password",
        method: "POST",
        body,
      }),
    }),
    resetPassword: builder.mutation<{ message: string }, ResetPasswordPayload>({
      query: ({ token, ...body }) => ({
        url: `reset-password/${token}`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation, useForgotPasswordMutation, useResetPasswordMutation } = authApi;
