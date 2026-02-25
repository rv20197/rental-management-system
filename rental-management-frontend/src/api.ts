import axios from "axios";

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
    // Session-based token handling prefers cookies which are managed by the browser automatically.
    // If we have any logic requiring a token from sessionStorage, we should consider removing it.
    const token = sessionStorage.getItem("token");
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
