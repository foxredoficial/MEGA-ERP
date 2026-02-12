import { useEffect, useMemo, useState } from 'react';
import { getAdminUsers, updateUserRole } from '@/lib/api_admin';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Input } from '@/components/ui/Input';
import { Search, UserCog } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

export function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleTargetUser, setRoleTargetUser] = useState<any | null>(null);
  const [roleTarget, setRoleTarget] = useState<'admin' | 'user' | null>(null);
  const [roleUpdating, setRoleUpdating] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleRoleClick = (user: any) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setRoleTargetUser(user);
    setRoleTarget(newRole);
    setRoleDialogOpen(true);
  };

  const handleConfirmToggleRole = async () => {
    if (!roleTargetUser || !roleTarget) return;
    setRoleUpdating(true);
    try {
      await updateUserRole(roleTargetUser.id, roleTarget);
      setUsers((prev) => prev.map((u) => (u.id === roleTargetUser.id ? { ...u, role: roleTarget } : u)));
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar cargo");
    } finally {
      setRoleUpdating(false);
      setRoleDialogOpen(false);
      setRoleTargetUser(null);
      setRoleTarget(null);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return users.filter((user) => user.full_name?.toLowerCase().includes(q) || user.email?.toLowerCase().includes(q));
  }, [users, searchTerm]);

  const total = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedUsers = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, page, pageSize, totalPages]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Erro ao carregar usuários: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Clientes</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie os usuários e suas permissões.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Lista de Usuários</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar por nome ou email..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Usuário</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Função</th>
                  <th className="px-6 py-3 font-medium">Cadastro</th>
                  <th className="px-6 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {pagedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100">
                          {/* Gravatar fallback or initials could go here */}
                          <div className="flex h-full w-full items-center justify-center bg-blue-100 text-blue-600 font-semibold">
                            {user.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{user.full_name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone="green" className="bg-green-100 text-green-700">Ativo</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={user.role === 'admin' ? 'blue' : 'slate'}>
                        {user.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleRoleClick(user)}
                        title={user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>

          <div className="mt-4">
            <Pagination
              label="Usuários"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        onConfirm={handleConfirmToggleRole}
        title="Alterar cargo do usuário"
        description={
          roleTargetUser && roleTarget
            ? `Tem certeza que deseja alterar o cargo de ${roleTargetUser.full_name} para ${roleTarget}?`
            : undefined
        }
        confirmText="Confirmar"
        variant="warning"
        loading={roleUpdating}
      />
    </div>
  );
}
