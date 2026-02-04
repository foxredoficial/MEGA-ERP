import { useEffect, useState } from 'react';
import { getAdminUsers, updateUserRole } from '@/lib/api_admin';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Search, UserCog } from 'lucide-react';

export function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleRole = async (user: any) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Tem certeza que deseja alterar o cargo de ${user.full_name} para ${newRole}?`)) return;

    try {
      await updateUserRole(user.id, newRole);
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar cargo");
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Clientes</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie os usuários e suas permissões.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Lista de Usuários</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Buscar por nome ou email..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Usuário</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Função</th>
                  <th className="px-6 py-3 font-medium">Cadastro</th>
                  <th className="px-6 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-100">
                          {/* Gravatar fallback or initials could go here */}
                          <div className="flex h-full w-full items-center justify-center bg-blue-100 text-blue-600 font-semibold">
                            {user.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{user.full_name}</div>
                          <div className="text-xs text-zinc-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone="green" className="bg-green-100 text-green-700">Ativo</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={user.role === 'admin' ? 'blue' : 'zinc'}>
                        {user.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleRole(user)}
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
              <div className="p-6 text-center text-zinc-500">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
