import React, { useState, useEffect } from 'react'
import { Building2, Save } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useEmpresa, useSalvarEmpresa } from '../hooks/useEmpresa'
import { EmpresaRequest } from '@/shared/api/empresa'

const REGIMES = [
  { value: 'SIMPLES',          label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO',  label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL',       label: 'Lucro Real' },
]

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

const EMPTY: EmpresaRequest = {
  cnpj: '', razaoSocial: '', nomeFantasia: '', ie: '',
  logradouro: '', numero: '', bairro: '', cidade: '', uf: 'MA', cep: '',
  regimeTributario: 'SIMPLES',
}

export default function EmpresaPage() {
  const { data, isLoading } = useEmpresa()
  const salvar = useSalvarEmpresa()

  const [form, setForm] = useState<EmpresaRequest>(EMPTY)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (data) {
      setForm({
        cnpj:             data.cnpj,
        razaoSocial:      data.razaoSocial,
        nomeFantasia:     data.nomeFantasia ?? '',
        ie:               data.ie ?? '',
        logradouro:       data.logradouro,
        numero:           data.numero,
        bairro:           data.bairro,
        cidade:           data.cidade,
        uf:               data.uf,
        cep:              data.cep,
        regimeTributario: data.regimeTributario,
      })
    }
  }, [data])

  function set(field: keyof EmpresaRequest, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setSucesso(false)
    setErro(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    salvar.mutate(form, {
      onSuccess: () => setSucesso(true),
      onError: (err: any) => {
        setErro(err?.response?.data?.detalhes ?? err?.response?.data?.erro ?? 'Erro ao salvar.')
      },
    })
  }

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5'

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dados da Empresa" subtitle="Informações usadas nas NF-e e DANFE" />
        <div className="animate-pulse space-y-4">
          <div className="h-48 rounded-xl bg-muted" />
          <div className="h-48 rounded-xl bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Dados da Empresa"
        subtitle="Informações usadas nas NF-e e DANFE"
        actions={
          <Button onClick={handleSubmit} disabled={salvar.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        }
      />

      {!data && !isLoading && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          <Building2 className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Empresa ainda não configurada. Preencha os dados abaixo para que o DANFE seja emitido corretamente.
          </p>
        </div>
      )}

      {sucesso && (
        <p className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Dados salvos com sucesso.
        </p>
      )}

      {erro && (
        <p className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Identificação */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-sm font-semibold text-foreground">Identificação</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>
                <label className={labelClass}>CNPJ *</label>
                <Input
                  required
                  value={form.cnpj}
                  onChange={(e) => set('cnpj', e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div>
                <label className={labelClass}>Inscrição Estadual</label>
                <Input
                  value={form.ie ?? ''}
                  onChange={(e) => set('ie', e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Razão Social *</label>
                <Input
                  required
                  value={form.razaoSocial}
                  onChange={(e) => set('razaoSocial', e.target.value)}
                  placeholder="Nome jurídico completo"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Nome Fantasia</label>
                <Input
                  value={form.nomeFantasia ?? ''}
                  onChange={(e) => set('nomeFantasia', e.target.value)}
                  placeholder="Como a empresa é conhecida (opcional)"
                />
              </div>

              <div>
                <label className={labelClass}>Regime Tributário *</label>
                <select
                  required
                  value={form.regimeTributario}
                  onChange={(e) => set('regimeTributario', e.target.value)}
                  className={inputClass}
                >
                  {REGIMES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-sm font-semibold text-foreground">Endereço</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

              <div className="sm:col-span-2">
                <label className={labelClass}>Logradouro *</label>
                <Input
                  required
                  value={form.logradouro}
                  onChange={(e) => set('logradouro', e.target.value)}
                  placeholder="Rua, Avenida, Travessa…"
                />
              </div>

              <div>
                <label className={labelClass}>Número *</label>
                <Input
                  required
                  value={form.numero}
                  onChange={(e) => set('numero', e.target.value)}
                  placeholder="123"
                />
              </div>

              <div>
                <label className={labelClass}>Bairro *</label>
                <Input
                  required
                  value={form.bairro}
                  onChange={(e) => set('bairro', e.target.value)}
                  placeholder="Bairro"
                />
              </div>

              <div>
                <label className={labelClass}>Cidade *</label>
                <Input
                  required
                  value={form.cidade}
                  onChange={(e) => set('cidade', e.target.value)}
                  placeholder="Cidade"
                />
              </div>

              <div>
                <label className={labelClass}>CEP *</label>
                <Input
                  required
                  value={form.cep}
                  onChange={(e) => set('cep', e.target.value)}
                  placeholder="00000-000"
                />
              </div>

              <div>
                <label className={labelClass}>UF *</label>
                <select
                  required
                  value={form.uf}
                  onChange={(e) => set('uf', e.target.value)}
                  className={inputClass}
                >
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

      </form>
    </div>
  )
}
