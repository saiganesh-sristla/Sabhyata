import axios from "axios";

const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_BASE_URL) ||
  "https://sabhyata.onrender.com/api";

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // increased to 30s to accommodate slower deployed environments
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post("/auth/login", credentials),

  staffLogin: (credentials: { email: string; password: string }) =>
    apiClient.post("/auth/staff-login", credentials),

  register: (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) => apiClient.post("/auth/register", userData),

  getCurrentUser: () => apiClient.get("/auth/me"),

  logout: () => apiClient.post("/auth/logout"),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put("/auth/change-password", data),
};

// Admin API
export const adminAPI = {
  // Dashboard
  getDashboardStats: (params?: any) =>
    apiClient.get("/admin/dashboard/stats", { params }),

  getRevenueAnalytics: (params?: any) =>
    apiClient.get("/admin/dashboard/revenue-analytics", { params }),

  // Bookings
  getBookings: (params?: any) => apiClient.get("/admin/bookings", { params }),

  getBookingById: (id: string) => apiClient.get(`/admin/bookings/${id}`),

  createBooking: (data: any) => apiClient.post("/admin/bookings", data),

  updateBookingStatus: (id: string, data: any) =>
    apiClient.put(`/admin/bookings/${id}`, data),

  deleteBooking: (id: string) => apiClient.delete(`/admin/bookings/${id}`),

  bulkDeleteBookings: (bookingIds: string[]) =>
    apiClient.post("/admin/bookings/bulk-delete", { bookingIds }),

  exportBookings: (params?: any) =>
    apiClient.get("/admin/bookings/export", { params, responseType: "blob" }),

  getBookingAnalytics: (params?: any) =>
    apiClient.get("/admin/bookings/analytics", { params }),

  // Events
  getEvents: (params?: any) => apiClient.get("/admin/events", { params }),

  getEventById: (id: string) => apiClient.get(`/admin/events/${id}`),

  createEvent: (data: any) => apiClient.post("/admin/events", data),

  updateEvent: (id: string, data: any) =>
    apiClient.put(`/admin/events/${id}`, data),

  deleteEvent: (id: string) => apiClient.delete(`/admin/events/${id}`),

  toggleEventStatus: (id: string, status: string) =>
    apiClient.patch(`/admin/events/${id}/status`, { status }),

  getEventCategories: () => apiClient.get("/admin/events/categories"),

  // Users
  getUsers: (params?: any) => apiClient.get("/admin/users", { params }),

  getUserById: (id: string) => apiClient.get(`/admin/users/${id}`),

  updateUser: (id: string, data: any) =>
    apiClient.put(`/admin/users/${id}`, data),

  toggleUserBlock: (id: string, isBlocked: boolean) =>
    apiClient.post(`/admin/users/${id}/block`, { isBlocked }),

  deleteUser: (id: string) => apiClient.delete(`/admin/users/${id}`),

  exportUsers: (params?: any) =>
    apiClient.get("/admin/users/export", { params, responseType: "blob" }),

  getUserStats: () => apiClient.get("/admin/users/stats"),

  // Monuments
  getMonuments: (params?: any) => apiClient.get("/admin/monuments", { params }),

  getMonumentById: (id: string) => apiClient.get(`/admin/monuments/${id}`),

  createMonument: (data: any) => apiClient.post("/admin/monuments", data),

  updateMonument: (id: string, data: any) =>
    apiClient.put(`/admin/monuments/${id}`, data),

  deleteMonument: (id: string) => apiClient.delete(`/admin/monuments/${id}`),

  getMonumentFilters: () => apiClient.get("/admin/monuments/filters"),

  // Abandoned Carts
  getAbandonedCarts: (params?: any) =>
    apiClient.get("/admin/abandoned-carts", { params }),

  getAbandonedCartById: (id: string) =>
    apiClient.get(`/admin/abandoned-carts/${id}`),

  sendCartReminder: (id: string) =>
    apiClient.post(`/admin/abandoned-carts/${id}/reminder`),

  deleteAbandonedCart: (id: string) =>
    apiClient.delete(`/admin/abandoned-carts/${id}`),

  exportAbandonedCarts: (params?: any) =>
    apiClient.get("/admin/abandoned-carts/export", {
      params,
      responseType: "blob",
    }),

  getAbandonedCartAnalytics: () =>
    apiClient.get("/admin/abandoned-carts/analytics"),
};

// Payments API
export const paymentsAPI = {
  createOrder: (data: { amount: number; bookingId: string }) =>
    apiClient.post("/payments/create-order", data),
  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    bookingId: string;
  }) => apiClient.post("/payments/verify", data),
};

// Utility function to download file from blob response
export const downloadFile = (response: any, filename?: string) => {
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename || "export.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default apiClient;