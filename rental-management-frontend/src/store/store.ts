import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { rentalApi } from "../api/rentalApi";
import { authApi } from "../api/authApi";
import { customerApi } from "../api/customerApi";
import { itemApi } from "../api/itemApi";
import { billingApi } from "../api/billingApi";

export const store = configureStore({
  reducer: {
    [rentalApi.reducerPath]: rentalApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [customerApi.reducerPath]: customerApi.reducer,
    [itemApi.reducerPath]: itemApi.reducer,
    [billingApi.reducerPath]: billingApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(rentalApi.middleware)
      .concat(authApi.middleware)
      .concat(customerApi.middleware)
      .concat(itemApi.middleware)
      .concat(billingApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
