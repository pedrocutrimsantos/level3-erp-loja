import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { useCriarCliente } from '../hooks/useClientes'

type TipoPessoa = 'PF' | 'PJ'

function formatarCpf(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatarCnpj(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export default function ClienteFormPage() {
  const navigate = useNavigate()
  const { mutate: criar, isPending } = useCriarCliente()

  const [tipo, setTipo] = useState<TipoPessoa>('PF')
  const [cnpjCpf, setCnpjCpf] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [erroServidor, setErroServidor] = useState<string | null>(null)

  function handleCnpjCpf(valor: string) {
    const digits = valor.replace(/\D/g, '')
    if (tipo === 'PF') {
      setCnpjCpf(formatarCpf(digits))
    } else {
      setCnpjCpf(formatarCnpj(digits))
    }
  }

  function handleTipoChange(novoTipo: TipoPessoa) {
    setTipo(novoTipo)
    setCnpjCpf('')
    setErrors({})
  }

  function validar() {
    const erros: Record<string, string> = {}
    if (!razaoSocial.trim()) {
      erros.razaoSocial = tipo === 'PJ' ? 'Razão social é obrigatória' : 'Nome é obrigatório'
    }
    const digits = cnpjCpf.replace(/\D/g, '')
    if (tipo === 'PF' && digits && digits.length !== 11) {
      erros.cnpjCpf = 'CPF deve ter 11 dígitos'
    }
    if (tipo === 'PJ' && digits && digits.length !== 14) {
      erros.cnpjCpf = 'CNPJ deve ter 14 dígitos'
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      erros.email = 'E-mail inválido'
    }
    return erros
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const erros = validar()
    setErrors(erros)
    if (Object.keys(erros).length > 0) return

    setErroServidor(null)
    criar(
      {
        tipoPessoa: tipo,
        cnpjCpf: cnpjCpf.replace(/\D/g, '') || undefined,
        razaoSocial: razaoSocial.trim(),
        nomeFantasia: nomeFantasia.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
      },
      {
        onSuccess: (cliente) => navigate(`/clientes/${cliente.id}`),
        onError: (err: unknown) => {
          const msg =
            (err as any)?.response?.data?.detalhes ??
            (err as any)?.response?.data?.erro ??
            'Erro ao cadastrar cliente.'
          setErroServidor(msg)
        },
      },
    )
  }

  const labelRazaoSocial = tipo === 'PJ' ? 'Razão Social *' : 'Nome *'
  const labelNomeFantasia = tipo === 'PJ' ? 'Nome Fantasia' : 'Apelido'
  const labelDocumento = tipo === 'PF' ? 'CPF' : 'CNPJ'
  const placeholderDocumento = tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'

  return (
    <div>
      <PageHeader
        title="Novo Cliente"
        subtitle="Cadastre um novo cliente"
        actions={
          <Button variant="outline" onClick={() => navigate('/clientes')}>
            Cancelar
          </Button>
        }
      />

      <form onSubmit={handleSubmit} noValidate>
        <div className="max-w-2xl flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Pessoa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {(['PF', 'PJ'] as TipoPessoa[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTipoChange(t)}
                    className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                      tipo === t
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t === 'PF' ? 'Pessoa Física (CPF)' : 'Pessoa Jurídica (CNPJ)'}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados Cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                label={labelRazaoSocial}
                placeholder={tipo === 'PJ' ? 'Ex: Madeireira Silva Ltda' : 'Ex: João da Silva'}
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                error={errors.razaoSocial}
              />

              <Input
                label={labelNomeFantasia}
                placeholder={tipo === 'PJ' ? 'Ex: Silva Madeiras' : 'Ex: João'}
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
              />

              <Input
                label={labelDocumento}
                placeholder={placeholderDocumento}
                value={cnpjCpf}
                onChange={(e) => handleCnpjCpf(e.target.value)}
                error={errors.cnpjCpf}
              />

              <Input
                label="Telefone"
                placeholder="Ex: (11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />

              <Input
                label="E-mail"
                type="email"
                placeholder="Ex: contato@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />

              {erroServidor && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {erroServidor}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" loading={isPending}>
              Salvar Cliente
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/clientes')}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
