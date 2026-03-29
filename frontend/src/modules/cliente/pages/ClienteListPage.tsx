import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { useClientes } from '../hooks/useClientes'
import type { ClienteResponse } from '@/shared/api/clientes'

function statusBadge(status: ClienteResponse['statusInad']) {
  const map = {
    REGULAR:  { variant: 'success' as const,      label: 'Regular' },
    ALERTA:   { variant: 'default' as const,       label: 'Alerta' },
    BLOQUEADO:{ variant: 'destructive' as const,   label: 'Bloqueado' },
  }
  return map[status]
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-gray-100" />
      ))}
    </div>
  )
}

export default function ClienteListPage() {
  const navigate = useNavigate()
  const [apenasAtivos, setApenasAtivos] = useState(true)
  const [busca, setBusca] = useState('')
  const { data: clientes, isLoading, isError } = useClientes(apenasAtivos)

  const filtrados = useMemo(() => {
    if (!clientes) return []
    const termo = busca.toLowerCase().trim()
    if (!termo) return clientes
    return clientes.filter(
      (c) =>
        c.razaoSocial.toLowerCase().includes(termo) ||
        c.nomeFantasia?.toLowerCase().includes(termo) ||
        c.cnpjCpf?.replace(/\D/g, '').includes(termo.replace(/\D/g, '')) ||
        c.email?.toLowerCase().includes(termo) ||
        c.telefone?.includes(termo),
    )
  }, [clientes, busca])

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Gerencie o cadastro de clientes"
        actions={
          <Button onClick={() => navigate('/clientes/novo')}>
            + Novo Cliente
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Buscar por nome, CPF/CNPJ, e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            checked={apenasAtivos}
            onChange={(e) => setApenasAtivos(e.target.checked)}
          />
          Apenas ativos
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Erro ao carregar clientes"
              description="Não foi possível buscar a lista. Tente novamente."
              className="py-16"
            />
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title={busca ? 'Nenhum cliente encontrado para a busca' : 'Nenhum cliente cadastrado'}
              description={!busca ? 'Cadastre o primeiro cliente.' : undefined}
              action={
                !busca ? (
                  <Button size="sm" onClick={() => navigate('/clientes/novo')}>
                    + Novo Cliente
                  </Button>
                ) : undefined
              }
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome / Razão Social</TableHead>
                  <TableHead>CPF / CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="outline">{c.tipoPessoa}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{c.razaoSocial}</p>
                      {c.nomeFantasia && (
                        <p className="text-xs text-muted-foreground">{c.nomeFantasia}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.cnpjCpf ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">{c.telefone ?? '—'}</TableCell>
                    <TableCell className="text-sm">{c.email ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadge(c.statusInad).variant}>
                        {statusBadge(c.statusInad).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/clientes/${c.id}`)}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
