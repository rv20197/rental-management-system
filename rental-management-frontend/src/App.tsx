import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const RentalsPage = lazy(() => import("./pages/RentalsPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const ItemsPage = lazy(() => import("./pages/ItemsPage"));
const BillingsPage = lazy(() => import("./pages/BillingsPage"));

import { Layout } from "./components/Layout";
import { Toaster } from "./components/ui/sonner";

function App() {
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const token = sessionStorage.getItem("token");
    return token ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
  };

  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const token = sessionStorage.getItem("token");
    return token ? <Navigate to="/dashboard" replace /> : <>{children}</>;
  };

  return (
    <Router>
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <Routes>
          <Route
            path="/login"
            element={<PublicRoute><LoginPage /></PublicRoute>}
          />
          <Route
            path="/signup"
            element={<PublicRoute><SignupPage /></PublicRoute>}
          />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/rentals"
            element={<ProtectedRoute><RentalsPage /></ProtectedRoute>}
          />
          <Route
            path="/customers"
            element={<ProtectedRoute><CustomersPage /></ProtectedRoute>}
          />
          <Route
            path="/items"
            element={<ProtectedRoute><ItemsPage /></ProtectedRoute>}
          />
          <Route
            path="/billings"
            element={<ProtectedRoute><BillingsPage /></ProtectedRoute>}
          />
          <Route path="/*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </Router>
  );
}

export default App;
