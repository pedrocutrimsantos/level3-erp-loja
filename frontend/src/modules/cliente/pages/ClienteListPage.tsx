import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useTemPermissao } from '@/shared/hooks/useTemPermissao'
import { Perms } from '@/shared/utils/permissions'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  MobileCardList, MobileCard, MobileCardRow, MobileCardActions,
} from '@/shared/components/ui/Table'
import { useClientes } from '../hooks/useClientes'
import type { ClienteResponse } from '@/shared/api/clientes'
import { FilterBar, FilterField } from '@/shared/components/layout/PageLayout'

function statusBadge(status: ClienteResponse['statusInad']) {
  const map = {
    REGULAR:   { variant: 'success'     as const, label: 'Regular' },
    ALERTA:    { variant: 'default'     as const, label: 'Alerta' },
    BLOQUEADO: { variant: 'destructive' as const, label: 'Bloqueado' },
  }
  return map[status]
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-muted" />
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-2 md:hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-muted" />
      ))}
    </div>
  )
}

export default function ClienteListPage() {
  const navigate = useNavigate()
  const [apenasAtivos, setApenasAtivos] = useState(true)
  const [busca, setBusca] = useState('')
  const { data: clientes, isLoading, isError } = useClientes(apenasAtivos)
  const podeCriarCliente = useTemPermissao(Perms.CAD_CLIENTE_CRIAR)

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

  const emptyContent = (
    <EmptyState
      icon={<Users className="h-6 w-6" />}
      title={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
      description={!busca ? 'Cadastre o primeiro cliente.' : undefined}
      action={
        !busca && podeCriarCliente ? (
          <Button size="sm" onClick={() => navigate('/clientes/novo')}>
            + Novo Cliente
          </Button>
        ) : undefined
      }
      className="py-16"
    />
  )

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Gerencie o cadastro de clientes"
        actions={
          podeCriarCliente ? (
            <Button onClick={() => navigate('/clientes/novo')}>
              + Novo Cliente
            </Button>
          ) : undefined
        }
      />

      <FilterBar className="mb-4">
        <FilterField label="Busca" className="flex-1 min-w-[200px]">
          <Input
            placeholder="Nome, CPF/CNPJ, e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 text-sm"
          />
        </FilterField>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none self-end pb-1">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            checked={apenasAtivos}
            onChange={(e) => setApenasAtivos(e.target.checked)}
          />
          Apenas ativos
        </label>
      </FilterBar>

      {/* ── Loading ── */}
      {isLoading && (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0"><TableSkeleton /></CardContent>
          </Card>
          <CardSkeleton />
        </>
      )}

      {/* ── Erro ── */}
      {isError && (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Erro ao carregar clientes"
          description="Não foi possível buscar a lista. Tente novamente."
          className="py-16"
        />
      )}

      {/* ── Conteúdo ── */}
      {!isLoading && !isError && (
        <>
          {filtrados.length === 0 ? (
            emptyContent
          ) : (
            <>
              {/* Desktop: tabela */}
              <Card className="hidden md:block">
                <CardContent className="p-0">
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
                          <TableCell className="font-mono text-sm">{c.cnpjCpf ?? '—'}</TableCell>
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
                </CardContent>
              </Card>

              {/* Mobile: cards */}
              <MobileCardList>
                {filtrados.map((c) => {
                  const st = statusBadge(c.statusInad)
                  return (
                    <MobileCard
                      key={c.id}
                      onClick={() => navigate(`/clientes/${c.id}`)}
                    >
                      <MobileCardRow
                        primary
                        label={c.tipoPessoa}
                        value={
                          <span>
                            {c.razaoSocial}
                            {c.nomeFantasia && (
                              <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">
                                {c.nomeFantasia}
                              </span>
                            )}
                          </span>
                        }
                      />
                      {c.cnpjCpf && (
                        <MobileCardRow label="CPF / CNPJ" value={
                          <span className="font-mono">{c.cnpjCpf}</span>
                        } />
                      )}
                      {c.telefone && (
                        <MobileCardRow label="Telefone" value={c.telefone} />
                      )}
                      <MobileCardRow
                        label="Status"
                        value={<Badge variant={st.variant}>{st.label}</Badge>}
                      />
                    </MobileCard>
                  )
                })}
              </MobileCardList>
            </>
          )}
        </>
      )}
    </div>
  )
}
