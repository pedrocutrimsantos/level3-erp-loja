import React, { useState, useMemo } from 'react'
import { Truck } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { useFornecedores, useCriarFornecedor } from '../hooks/useFornecedores'
import type { CriarFornecedorRequest } from '@/shared/api/fornecedores'
import { usePagination } from '@/shared/hooks/usePagination'
import { Pagination } from '@/shared/components/ui/Pagination'

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-gray-100" />
      ))}
    </div>
  )
}

interface NovoFornecedorModalProps {
  onClose: () => void
}

function NovoFornecedorModal({ onClose }: NovoFornecedorModalProps) {
  const { mutate, isPending, isError, error } = useCriarFornecedor()
  const [form, setForm] = useState<CriarFornecedorRequest>({
    tipoPessoa: 'PJ',
    cnpjCpf: '',
    razaoSocial: '',
  })

  function set(field: keyof CriarFornecedorRequest, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate(form, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Novo Fornecedor</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700">Tipo Pessoa *</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.tipoPessoa}
                onChange={(e) => set('tipoPessoa', e.target.value as 'PF' | 'PJ')}
              >
                <option value="PJ">PJ — Pessoa Jurídica</option>
                <option value="PF">PF — Pessoa Física</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700">CNPJ / CPF *</label>
              <Input
                className="mt-1"
                value={form.cnpjCpf}
                onChange={(e) => set('cnpjCpf', e.target.value)}
                placeholder="00.000.000/0001-00"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Razão Social / Nome *</label>
            <Input
              className="mt-1"
              value={form.razaoSocial}
              onChange={(e) => set('razaoSocial', e.target.value)}
              placeholder="Nome ou razão social"
              required
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700">Nome Fantasia</label>
              <Input
                className="mt-1"
                value={form.nomeFantasia ?? ''}
                onChange={(e) => set('nomeFantasia', e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700">Telefone</label>
              <Input
                className="mt-1"
                value={form.telefone ?? ''}
                onChange={(e) => set('telefone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700">E-mail</label>
              <Input
                className="mt-1"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="w-20">
              <label className="text-xs font-medium text-gray-700">UF</label>
              <Input
                className="mt-1"
                value={form.uf ?? ''}
                onChange={(e) => set('uf', e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="SP"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700">Cidade</label>
              <Input
                className="mt-1"
                value={form.cidade ?? ''}
                onChange={(e) => set('cidade', e.target.value)}
                placeholder="São Paulo"
              />
            </div>
          </div>

          {isError && (
            <p className="text-sm text-red-600">
              {(error as Error)?.message ?? 'Erro ao salvar fornecedor.'}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FornecedoresPage() {
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const { data: fornecedores, isLoading, isError } = useFornecedores()

  const filtrados = useMemo(() => {
    if (!fornecedores) return []
    const termo = busca.toLowerCase().trim()
    if (!termo) return fornecedores
    return fornecedores.filter(
      (f) =>
        f.razaoSocial.toLowerCase().includes(termo) ||
        f.nomeFantasia?.toLowerCase().includes(termo) ||
        f.cnpjCpf.replace(/\D/g, '').includes(termo.replace(/\D/g, '')) ||
        f.cidade?.toLowerCase().includes(termo),
    )
  }, [fornecedores, busca])

  const { paginatedItems: fornecedoresPaginados, page, setPage, perPage, setPerPage, totalPages, totalItems } = usePagination(filtrados)

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle="Gerencie o cadastro de fornecedores"
        actions={
          <Button onClick={() => setShowModal(true)}>+ Novo Fornecedor</Button>
        }
      />

      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Buscar por nome, CNPJ, cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <EmptyState
              icon={<Truck className="h-6 w-6" />}
              title="Erro ao carregar fornecedores"
              description="Não foi possível buscar a lista. Tente novamente."
              className="py-16"
            />
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={<Truck className="h-6 w-6" />}
              title={busca ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
              description={!busca ? 'Cadastre o primeiro fornecedor.' : undefined}
              action={
                !busca ? (
                  <Button size="sm" onClick={() => setShowModal(true)}>
                    + Novo Fornecedor
                  </Button>
                ) : undefined
              }
              className="py-16"
            />
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome / Razão Social</TableHead>
                  <TableHead>CNPJ / CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cidade / UF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedoresPaginados.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Badge variant="outline">{f.tipoPessoa}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{f.razaoSocial}</p>
                      {f.nomeFantasia && (
                        <p className="text-xs text-muted-foreground">{f.nomeFantasia}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{f.cnpjCpf}</TableCell>
                    <TableCell className="text-sm">{f.telefone ?? '—'}</TableCell>
                    <TableCell className="text-sm">{f.email ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {f.cidade && f.uf ? `${f.cidade} / ${f.uf}` : f.cidade ?? f.uf ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border px-4 dark:border-[#243040]">
              <Pagination page={page} totalPages={totalPages} totalItems={totalItems} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {showModal && <NovoFornecedorModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
