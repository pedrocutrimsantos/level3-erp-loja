import React, { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Save, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { FormGrid, FormSection, TwoColLayout } from '@/shared/components/layout/PageLayout'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useEmpresa, useSalvarEmpresa, useUploadCertificado, useRemoverCertificado } from '../hooks/useEmpresa'
import { EmpresaRequest } from '@/shared/api/empresa'

const REGIMES = [
  { value: 'SIMPLES',         label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL',      label: 'Lucro Real' },
]

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

// ── Componente de certificado A1 ─────────────────────────────────────────────

interface CertificadoSectionProps {
  configurado: boolean
  nome: string | null
  vencimento: string | null
  arquivo: File | null
  onArquivoChange: (f: File | null) => void
  senha: string
  onSenhaChange: (s: string) => void
  onUpload: () => void
  onRemover: () => void
  uploading: boolean
  removendo: boolean
  erro: string | null
  sucesso: boolean
  certInputRef: React.RefObject<HTMLInputElement>
  labelClass: string
}

function CertificadoSection({
  configurado, nome, vencimento, arquivo, onArquivoChange,
  senha, onSenhaChange, onUpload, onRemover, uploading, removendo,
  erro, sucesso, certInputRef, labelClass,
}: CertificadoSectionProps) {
  const vencimentoDate = vencimento ? new Date(vencimento) : null
  const diasRestantes  = vencimentoDate
    ? Math.floor((vencimentoDate.getTime() - Date.now()) / 86_400_000)
    : null

  const vencimentoLabel = vencimentoDate
    ? vencimentoDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  const vencimentoStatus = diasRestantes !== null
    ? diasRestantes <= 0   ? 'vencido'
    : diasRestantes <= 30  ? 'critico'
    : diasRestantes <= 60  ? 'alerta'
    : 'ok'
    : null

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Certificado Digital A1</h3>
        </div>
        {configurado ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Configurado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Não configurado
          </span>
        )}
      </div>

      {/* Cert atual */}
      {configurado && nome && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Titular</p>
          <p className="text-sm font-medium truncate">{nome}</p>

          {vencimentoLabel && (
            <p className={[
              'text-xs font-medium mt-1',
              vencimentoStatus === 'vencido' ? 'text-destructive'
              : vencimentoStatus === 'critico' ? 'text-red-600 dark:text-red-400'
              : vencimentoStatus === 'alerta'  ? 'text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground',
            ].join(' ')}>
              {vencimentoStatus === 'vencido'
                ? `Vencido em ${vencimentoLabel}`
                : `Válido até ${vencimentoLabel}${diasRestantes !== null ? ` (${diasRestantes} dias)` : ''}`}
            </p>
          )}
        </div>
      )}

      {/* Upload */}
      <div className="space-y-3">
        <div>
          <label className={labelClass}>{configurado ? 'Substituir certificado (.pfx)' : 'Arquivo do certificado (.pfx)'}</label>
          <input
            ref={certInputRef}
            type="file"
            accept=".pfx,.p12"
            onChange={(e) => onArquivoChange(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted-foreground
              file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border
              file:text-xs file:font-medium file:bg-muted file:text-foreground
              hover:file:bg-muted/80 cursor-pointer"
          />
        </div>

        <div>
          <label className={labelClass}>Senha do certificado</label>
          <Input
            type="password"
            value={senha}
            onChange={(e) => onSenhaChange(e.target.value)}
            placeholder="Senha do arquivo .pfx"
            autoComplete="new-password"
          />
        </div>

        {erro && (
          <p className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {erro}
          </p>
        )}
        {sucesso && (
          <p className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            Certificado enviado e validado com sucesso.
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!arquivo || !senha || uploading}
            onClick={onUpload}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {uploading ? 'Enviando…' : 'Enviar certificado'}
          </Button>

          {configurado && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={removendo}
              onClick={onRemover}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {removendo ? 'Removendo…' : 'Remover'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const EMPTY: EmpresaRequest = {
  cnpj: '', razaoSocial: '', nomeFantasia: '', ie: '',
  logradouro: '', numero: '', bairro: '', cidade: '', uf: 'MA', cep: '',
  regimeTributario: 'SIMPLES',
  cfopPadrao: '5102', codigoMunicipioIbge: '',
  serieNfe: '001', ambienteNfe: 'HOMOLOGACAO',
}

export default function EmpresaPage() {
  const { data, isLoading } = useEmpresa()
  const salvar              = useSalvarEmpresa()
  const uploadCert          = useUploadCertificado()
  const removerCert         = useRemoverCertificado()

  const [form, setForm]               = useState<EmpresaRequest>(EMPTY)
  const [sucesso, setSucesso]         = useState(false)
  const [erro, setErro]               = useState<string | null>(null)
  const [certSenha, setCertSenha]     = useState('')
  const [certArquivo, setCertArquivo] = useState<File | null>(null)
  const [certErro, setCertErro]       = useState<string | null>(null)
  const [certSucesso, setCertSucesso] = useState(false)
  const certInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (data) {
      setForm({
        cnpj:                data.cnpj,
        razaoSocial:         data.razaoSocial,
        nomeFantasia:        data.nomeFantasia ?? '',
        ie:                  data.ie ?? '',
        logradouro:          data.logradouro,
        numero:              data.numero,
        bairro:              data.bairro,
        cidade:              data.cidade,
        uf:                  data.uf,
        cep:                 data.cep,
        regimeTributario:    data.regimeTributario,
        cfopPadrao:          data.cfopPadrao,
        codigoMunicipioIbge: data.codigoMunicipioIbge ?? '',
        serieNfe:            data.serieNfe,
        ambienteNfe:         data.ambienteNfe,
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

  function handleCertUpload() {
    if (!certArquivo) return
    setCertErro(null)
    setCertSucesso(false)

    const reader = new FileReader()
    reader.onload = () => {
      // FileReader retorna "data:application/...;base64,<dados>"
      const result = reader.result as string
      const base64 = result.split(',')[1]
      uploadCert.mutate(
        { certificadoBase64: base64, senha: certSenha },
        {
          onSuccess: () => {
            setCertSucesso(true)
            setCertSenha('')
            setCertArquivo(null)
            if (certInputRef.current) certInputRef.current.value = ''
          },
          onError: (err: any) => {
            setCertErro(err?.response?.data?.detalhes ?? err?.response?.data?.erro ?? 'Erro ao enviar certificado.')
          },
        }
      )
    }
    reader.readAsDataURL(certArquivo)
  }

  function handleRemoverCert() {
    if (!confirm('Remover o certificado digital? A emissão de NF-e será desabilitada.')) return
    removerCert.mutate(undefined, {
      onError: (err: any) => {
        setCertErro(err?.response?.data?.erro ?? 'Erro ao remover certificado.')
      },
    })
  }

  const selectClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ' +
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 ' +
    'dark:bg-[#0d1117] dark:border-[#243040]'

  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5'

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Dados da Empresa" subtitle="Informações usadas nas NF-e e DANFE" />
        <div className="animate-pulse space-y-4">
          <div className="xl:grid xl:grid-cols-[1fr_400px] xl:gap-6 space-y-4 xl:space-y-0">
            <div className="space-y-4">
              <div className="h-48 rounded-xl bg-muted" />
              <div className="h-56 rounded-xl bg-muted" />
            </div>
            <div className="h-96 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  const producaoSelecionado = form.ambienteNfe === 'PRODUCAO'

  return (
    <div className="space-y-5">
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

      {/* Alertas ── */}
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

      {/* Layout: 2 colunas em xl+ (main + sidebar NF-e) ── */}
      <form onSubmit={handleSubmit}>
        <TwoColLayout sidebarWidth="400px">
          {/* ── Coluna esquerda: Identificação + Endereço ── */}
          <>
            {/* Identificação */}
            <FormSection title="Identificação">
              <FormGrid cols={3}>
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

                <div>
                  <label className={labelClass}>Regime Tributário *</label>
                  <select
                    required
                    value={form.regimeTributario}
                    onChange={(e) => set('regimeTributario', e.target.value)}
                    className={selectClass}
                  >
                    {REGIMES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
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

                <div>
                  <label className={labelClass}>Nome Fantasia</label>
                  <Input
                    value={form.nomeFantasia ?? ''}
                    onChange={(e) => set('nomeFantasia', e.target.value)}
                    placeholder="Como a empresa é conhecida"
                  />
                </div>
              </FormGrid>
            </FormSection>

            {/* Endereço */}
            <FormSection title="Endereço">
              <FormGrid cols={4}>
                <div className="sm:col-span-2 lg:col-span-3">
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

                <div className="sm:col-span-1 lg:col-span-2">
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
                    className={selectClass}
                  >
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </FormGrid>
            </FormSection>
          </>

          {/* ── Coluna direita: Configuração NF-e ── */}
          <div className="space-y-4">
            <FormSection
              title="Configuração NF-e"
              badge={
                data?.nfeConfigurada ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Pronta para emitir
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Incompleta
                  </span>
                )
              }
            >
              <div className="space-y-4">
                {/* CFOP + Série + IBGE */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>CFOP</label>
                    <Input
                      value={form.cfopPadrao ?? '5102'}
                      onChange={(e) => set('cfopPadrao', e.target.value)}
                      placeholder="5102"
                      maxLength={4}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">4 dígitos</p>
                  </div>

                  <div>
                    <label className={labelClass}>Série</label>
                    <Input
                      value={form.serieNfe ?? '001'}
                      onChange={(e) => set('serieNfe', e.target.value)}
                      placeholder="001"
                      maxLength={3}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Cód. IBGE</label>
                    <Input
                      value={form.codigoMunicipioIbge ?? ''}
                      onChange={(e) => set('codigoMunicipioIbge', e.target.value)}
                      placeholder="7 dígitos"
                      maxLength={7}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">Município do emitente</p>
                  </div>
                </div>

                {/* Ambiente */}
                <div>
                  <label className={labelClass}>Ambiente de Emissão</label>
                  <div className="flex flex-col gap-2">
                    {(['HOMOLOGACAO', 'PRODUCAO'] as const).map((amb) => (
                      <label
                        key={amb}
                        className={[
                          'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
                          form.ambienteNfe === amb
                            ? amb === 'PRODUCAO'
                              ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                              : 'border-primary bg-primary/5 text-primary dark:text-[#4ade80]'
                            : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          name="ambienteNfe"
                          value={amb}
                          checked={form.ambienteNfe === amb}
                          onChange={() => set('ambienteNfe', amb)}
                          className="sr-only"
                        />
                        <span
                          className={[
                            'h-3.5 w-3.5 rounded-full border-2 shrink-0',
                            form.ambienteNfe === amb
                              ? amb === 'PRODUCAO'
                                ? 'border-red-500 bg-red-500'
                                : 'border-primary bg-primary'
                              : 'border-muted-foreground/40',
                          ].join(' ')}
                        />
                        <div>
                          <p className="font-medium leading-none">
                            {amb === 'HOMOLOGACAO' ? 'Homologação' : 'Produção'}
                          </p>
                          <p className="mt-0.5 text-xs opacity-70">
                            {amb === 'HOMOLOGACAO'
                              ? 'NF-e de teste — sem valor fiscal'
                              : 'NF-e real — SEFAZ oficial'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {producaoSelecionado && (
                    <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <p className="text-xs text-red-700 dark:text-red-300">
                        <span className="font-semibold">Atenção:</span> em Produção as NF-e têm validade fiscal real.
                        Certifique-se de que o certificado e as configurações estão corretos.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </FormSection>

            {/* ── Certificado A1 ── (fora do <form> para não interferir no submit) */}
            <CertificadoSection
              configurado={data?.certificadoConfigurado ?? false}
              nome={data?.certificadoNome ?? null}
              vencimento={data?.certificadoVencimento ?? null}
              arquivo={certArquivo}
              onArquivoChange={(f) => { setCertArquivo(f); setCertErro(null); setCertSucesso(false) }}
              senha={certSenha}
              onSenhaChange={(s) => setCertSenha(s)}
              onUpload={handleCertUpload}
              onRemover={handleRemoverCert}
              uploading={uploadCert.isPending}
              removendo={removerCert.isPending}
              erro={certErro}
              sucesso={certSucesso}
              certInputRef={certInputRef}
              labelClass={labelClass}
            />
          </div>
        </TwoColLayout>
      </form>
    </div>
  )
}
