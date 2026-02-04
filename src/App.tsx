import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Planos from "@/pages/Planos";
import Auth from "@/pages/Auth";
import CustomerApp from "@/pages/CustomerApp";
import { ProductList } from "@/pages/Products/ProductList";
import { ProductForm } from "@/pages/Products/ProductForm";
import { ContactList } from "@/pages/Contacts/ContactList";
import { ContactForm } from "@/pages/Contacts/ContactForm";
import { ServiceList } from "@/pages/Services/ServiceList";
import { ServiceForm } from "@/pages/Services/ServiceForm";
import { ServiceOrderList } from "@/pages/ServiceOrders/ServiceOrderList";
import Termos from "@/pages/Termos";
import Privacidade from "@/pages/Privacidade";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuthInit } from "@/hooks/useAuthInit";

import AdminRoute from "@/components/AdminRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Dashboard as AdminDashboard } from "@/pages/admin/Dashboard";
import { Users as AdminUsers } from "@/pages/admin/Users";
import { Plans as AdminPlans } from "@/pages/admin/Plans";
import { Subscriptions as AdminSubscriptions } from "@/pages/admin/Subscriptions";
import { Settings as AdminSettings } from "@/pages/admin/Settings";

export default function App() {
  useAuthInit();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planos" element={<Planos />} />
        
        {/* Auth Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Navigate to="/auth?mode=login" replace />} />
        <Route path="/entrar" element={<Navigate to="/auth?mode=login" replace />} />
        <Route path="/register" element={<Navigate to="/auth?mode=signup" replace />} />
        <Route path="/cadastro" element={<Navigate to="/auth?mode=signup" replace />} />
        <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />
        
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        
        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <CustomerApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/produtos"
          element={
            <ProtectedRoute>
              <ProductList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/produtos/novo"
          element={
            <ProtectedRoute>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/produtos/:id"
          element={
            <ProtectedRoute>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/servicos"
          element={
            <ProtectedRoute>
              <ServiceList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/servicos/novo"
          element={
            <ProtectedRoute>
              <ServiceForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/servicos/:id"
          element={
            <ProtectedRoute>
              <ServiceForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/ordens-servico"
          element={
            <ProtectedRoute>
              <ServiceOrderList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/contatos"
          element={
            <ProtectedRoute>
              <ContactList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/contatos/novo"
          element={
            <ProtectedRoute>
              <ContactForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/contatos/:id"
          element={
            <ProtectedRoute>
              <ContactForm />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
