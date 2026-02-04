import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

export function AdminLayout() {
  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/50">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
