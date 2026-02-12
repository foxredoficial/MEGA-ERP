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
            <PublicRoute>
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
              <ReportsCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/relatorios/:id"
          element={
            <ProtectedRoute>
              <ReportsCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/relatorios/imprimir/:id"
          element={
            <ProtectedRoute>
              <ReportPrint />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/atalhos"
          element={
            <ProtectedRoute>
              <AppLauncher />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/notificacoes"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/ajuda"
          element={
            <ProtectedRoute>
              <HelpCenter />
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
          path="/app/estoque/lancamentos"
          element={
            <ProtectedRoute>
              <StockMovements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/estoque/conferencia"
          element={
            <ProtectedRoute>
              <InventoryCheck />
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
          path="/app/vendas/pedidos"
          element={
            <ProtectedRoute>
              <SalesOrderList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendas/pedidos/novo"
          element={
            <ProtectedRoute>
              <SalesOrderForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendas/pedidos/:id"
          element={
            <ProtectedRoute>
              <SalesOrderForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/pdv"
          element={
            <ProtectedRoute>
              <POS />
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
          path="/app/ordens-servico/novo"
          element={
            <ProtectedRoute>
              <ServiceOrderForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/ordens-servico/:id"
          element={
            <ProtectedRoute>
              <ServiceOrderForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/clientes"
          element={
            <ProtectedRoute>
              <ContactList type="client" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/clientes/novo"
          element={
            <ProtectedRoute>
              <ContactForm type="client" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/clientes/:id"
          element={
            <ProtectedRoute>
              <ContactForm type="client" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/fornecedores"
          element={
            <ProtectedRoute>
              <ContactList type="supplier" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/fornecedores/novo"
          element={
            <ProtectedRoute>
              <ContactForm type="supplier" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/fornecedores/:id"
          element={
            <ProtectedRoute>
              <ContactForm type="supplier" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro"
          element={
            <ProtectedRoute>
              <FinanceOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/cadastros"
          element={
            <ProtectedRoute>
              <FinanceCadastros />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/caixa"
          element={
            <ProtectedRoute>
              <CashControlList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/caixa/:id"
          element={
            <ProtectedRoute>
              <CashControlDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/titulos"
          element={
            <ProtectedRoute>
              <FinancialTitlesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/bancos"
          element={
            <ProtectedRoute>
              <BankAccountsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/bancos/novo"
          element={
            <ProtectedRoute>
              <BankAccountForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/bancos/:id"
          element={
            <ProtectedRoute>
              <BankAccountForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/conciliacao"
          element={
            <ProtectedRoute>
              <ReconciliationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/fluxo-caixa"
          element={
            <ProtectedRoute>
              <CashflowPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/financeiro/dre"
          element={
            <ProtectedRoute>
              <DrePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/docs/:type"
          element={
            <ProtectedRoute>
              <DocsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/docs/:type/novo"
          element={
            <ProtectedRoute>
              <DocsForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/docs/:type/:id"
          element={
            <ProtectedRoute>
              <DocsForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendedores"
          element={
            <ProtectedRoute>
              <SalespersonList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendedores/novo"
          element={
            <ProtectedRoute>
              <SalespersonForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/vendedores/:id"
          element={
            <ProtectedRoute>
              <SalespersonForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/categorias"
          element={
            <ProtectedRoute>
              <CategoryList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/categorias/nova"
          element={
            <ProtectedRoute>
              <CategoryForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/categorias/:id"
          element={
            <ProtectedRoute>
              <CategoryForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/listas-preco"
          element={
            <ProtectedRoute>
              <PriceListList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/listas-preco/novo"
          element={
            <ProtectedRoute>
              <PriceListForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/listas-preco/:id"
          element={
            <ProtectedRoute>
              <PriceListForm />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
