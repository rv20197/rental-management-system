import axios from "axios";
import { getSessionToken } from "./lib/browser";

const base = import.meta.env.VITE_API_URL || "http://localhost:4000";
export const baseUrl = `${base}/api`;
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log("API Base URL:", baseUrl);
}
const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = getSessionToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
