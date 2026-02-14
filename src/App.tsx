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
import { ServiceOrderForm } from "@/pages/ServiceOrders/ServiceOrderForm";
import { SalesOrderList } from "@/pages/Sales/SalesOrderList";
import { SalesOrderForm } from "@/pages/Sales/SalesOrderForm";
import { POS } from "@/pages/POS/POS";
import { CashControlList } from "@/pages/Financial/CashControlList";
import { CashControlDetail } from "@/pages/Financial/CashControlDetail";
import { FinancialTitlesList } from "@/pages/Financial/FinancialTitlesList";
import { BankAccountsList } from "@/pages/Financial/BankAccountsList";
import { BankAccountForm } from "@/pages/Financial/BankAccountForm";
import FinanceOverview from "@/pages/Financial/FinanceOverview";
import FinanceCadastros from "@/pages/Financial/FinanceCadastros";
import ReconciliationPage from "@/pages/Financial/ReconciliationPage";
import CashflowPage from "@/pages/Financial/CashflowPage";
import DrePage from "@/pages/Financial/DrePage";
import { SalespersonList } from "@/pages/Salespersons/SalespersonList";
import { SalespersonForm } from "@/pages/Salespersons/SalespersonForm";
import { CategoryList } from "@/pages/Categories/CategoryList";
import { CategoryForm } from "@/pages/Categories/CategoryForm";
import { PriceListList } from "@/pages/PriceLists/PriceListList";
import { PriceListForm } from "@/pages/PriceLists/PriceListForm";
import { DocsList } from "@/pages/Docs/DocsList";
import { DocsForm } from "@/pages/Docs/DocsForm";
import { StockMovements } from "@/pages/Stock/StockMovements";
import { InventoryCheck } from "@/pages/Stock/InventoryCheck";
import { ReportsCenter } from "@/pages/Reports/ReportsCenter";
import { ReportPrint } from "@/pages/Reports/ReportPrint";
import { AppLauncher } from "@/pages/Apps/AppLauncher";
import { NotificationsPage } from "@/pages/Notifications/NotificationsPage";
import { HelpCenter } from "@/pages/Help/HelpCenter";
import Termos from "@/pages/Termos";
import Privacidade from "@/pages/Privacidade";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuthInit } from "@/hooks/useAuthInit";
import { FeatureGate } from "@/components/FeatureGate";

import AdminRoute from "@/components/AdminRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Dashboard as AdminDashboard } from "@/pages/admin/Dashboard";
import { Users as AdminUsers } from "@/pages/admin/Users";
import { Plans as AdminPlans } from "@/pages/admin/Plans";
import { Subscriptions as AdminSubscriptions } from "@/pages/admin/Subscriptions";
import { Settings as AdminSettings } from "@/pages/admin/Settings";

import { PublicRoute } from "@/components/PublicRoute";

export default function App() {
  useAuthInit();

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <Home />
            </PublicRoute>
          } 
        />
        <Route 
          path="/planos" 
          element={
            <PublicRoute allowSignedIn>
              <Planos />
            </PublicRoute>
          } 
        />
        
        {/* Auth Routes */}
        <Route 
          path="/auth" 
          element={
            <PublicRoute>
              <Auth />
            </PublicRoute>
          } 
        />
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
          path="/app/relatorios"
          element={
            <ProtectedRoute>
              <FeatureGate feature="reports">
                <ReportsCenter />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/relatorios/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="reports">
                <ReportsCenter />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/relatorios/imprimir/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="reports">
                <ReportPrint />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/atalhos"
          element={
            <ProtectedRoute>
              <FeatureGate feature="apps">
                <AppLauncher />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/notificacoes"
          element={
            <ProtectedRoute>
              <FeatureGate feature="notifications">
                <NotificationsPage />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/ajuda"
          element={
            <ProtectedRoute>
              <FeatureGate feature="help">
                <HelpCenter />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/produtos"
          element={
            <ProtectedRoute>
              <FeatureGate feature="products">
                <ProductList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/estoque/lancamentos"
          element={
            <ProtectedRoute>
              <FeatureGate feature="stock">
                <StockMovements />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/estoque/conferencia"
          element={
            <ProtectedRoute>
              <FeatureGate feature="stock">
                <InventoryCheck />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/produtos/novo"
          element={
            <ProtectedRoute>
              <FeatureGate feature="products">
                <ProductForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/produtos/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="products">
                <ProductForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/servicos"
          element={
            <ProtectedRoute>
              <FeatureGate feature="services">
                <ServiceList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/servicos/novo"
          element={
            <ProtectedRoute>
              <FeatureGate feature="services">
                <ServiceForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/servicos/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="services">
                <ServiceForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendas/pedidos"
          element={
            <ProtectedRoute>
              <FeatureGate feature="sales_orders">
                <SalesOrderList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendas/pedidos/novo"
          element={
            <ProtectedRoute>
              <FeatureGate feature="sales_orders">
                <SalesOrderForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendas/pedidos/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="sales_orders">
                <SalesOrderForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/pdv"
          element={
            <ProtectedRoute>
              <FeatureGate feature="pdv">
                <POS />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/ordens-servico"
          element={
            <ProtectedRoute>
              <FeatureGate feature="service_orders">
                <ServiceOrderList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/ordens-servico/novo"
          element={
            <ProtectedRoute>
              <FeatureGate feature="service_orders">
                <ServiceOrderForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/ordens-servico/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="service_orders">
                <ServiceOrderForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/clientes"
          element={
            <ProtectedRoute>
              <FeatureGate feature="contacts">
                <ContactList type="client" />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/clientes/novo"
          element={
            <ProtectedRoute>
              <FeatureGate feature="contacts">
                <ContactForm type="client" />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/clientes/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="contacts">
                <ContactForm type="client" />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/fornecedores"
          element={
            <ProtectedRoute>
              <FeatureGate feature="contacts">
                <ContactList type="supplier" />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/fornecedores/novo"
          element={
            <ProtectedRoute>
              <FeatureGate feature="contacts">
                <ContactForm type="supplier" />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/fornecedores/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="contacts">
                <ContactForm type="supplier" />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro"
          element={
            <ProtectedRoute>
              <FeatureGate feature="finance">
                <FinanceOverview />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/cadastros"
          element={
            <ProtectedRoute>
              <FeatureGate feature="finance">
                <FinanceCadastros />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/caixa"
          element={
            <ProtectedRoute>
              <FeatureGate feature="cash">
                <CashControlList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/caixa/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="cash">
                <CashControlDetail />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/titulos"
          element={
            <ProtectedRoute>
              <FeatureGate feature="finance">
                <FinancialTitlesList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/bancos"
          element={
            <ProtectedRoute>
              <FeatureGate feature="banks">
                <BankAccountsList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/bancos/novo"
          element={
            <ProtectedRoute>
              <FeatureGate feature="banks">
                <BankAccountForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/bancos/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="banks">
                <BankAccountForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/conciliacao"
          element={
            <ProtectedRoute>
              <FeatureGate feature="banks">
                <ReconciliationPage />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/fluxo-caixa"
          element={
            <ProtectedRoute>
              <FeatureGate feature="finance">
                <CashflowPage />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/dre"
          element={
            <ProtectedRoute>
              <FeatureGate feature="finance">
                <DrePage />
              </FeatureGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/docs/:type"
          element={
            <ProtectedRoute>
              <FeatureGate feature="docs">
                <DocsList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/docs/:type/novo"
          element={
            <ProtectedRoute>
              <FeatureGate feature="docs">
                <DocsForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/docs/:type/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="docs">
                <DocsForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendedores"
          element={
            <ProtectedRoute>
              <FeatureGate feature="salespersons">
                <SalespersonList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendedores/novo"
          element={
            <ProtectedRoute>
              <FeatureGate feature="salespersons">
                <SalespersonForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendedores/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="salespersons">
                <SalespersonForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/categorias"
          element={
            <ProtectedRoute>
              <FeatureGate feature="categories">
                <CategoryList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/categorias/nova"
          element={
            <ProtectedRoute>
              <FeatureGate feature="categories">
                <CategoryForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/categorias/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="categories">
                <CategoryForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/listas-preco"
          element={
            <ProtectedRoute>
              <FeatureGate feature="price_lists">
                <PriceListList />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/listas-preco/novo"
          element={
            <ProtectedRoute>
              <FeatureGate feature="price_lists">
                <PriceListForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/listas-preco/:id"
          element={
            <ProtectedRoute>
              <FeatureGate feature="price_lists">
                <PriceListForm />
              </FeatureGate>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
