import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'
import { authApi } from '@/shared/api/auth'

interface Props {
  open: boolean
  onClose: () => void
}

export function AlterarSenhaModal({ open, onClose }: Props) {
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' })
  const [mostrar, setMostrar] = useState(false)
  const [erro,    setErro]    = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [loading, setLoading] = useState(false)

  function reset() {
    setForm({ senhaAtual: '', novaSenha: '', confirmar: '' })
    setErro(null)
    setSucesso(false)
    setLoading(false)
    setMostrar(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (form.novaSenha.length < 8) {
      setErro('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (form.novaSenha !== form.confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await authApi.alterarSenha(form.senhaAtual, form.novaSenha)
      setSucesso(true)
    } catch (err: any) {
      const msg = err?.response?.data?.detalhes ?? err?.response?.data?.erro ?? 'Erro ao alterar senha.'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Alterar senha"
      footer={
        sucesso ? (
          <button
            onClick={handleClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Fechar
          </button>
        ) : (
          <>
            <button
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              form="alterar-senha-form"
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </>
        )
      }
    >
      {sucesso ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          Senha alterada com sucesso!
        </p>
      ) : (
        <form id="alterar-senha-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="senhaAtual">
              Senha atual
            </label>
            <div className="relative">
              <input
                id="senhaAtual"
                type={mostrar ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.senhaAtual}
                onChange={(e) => setForm((f) => ({ ...f, senhaAtual: e.target.value }))}
                required
                className={inputClass + ' pr-10'}
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="novaSenha">
              Nova senha
            </label>
            <input
              id="novaSenha"
              type={mostrar ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={form.novaSenha}
              onChange={(e) => setForm((f) => ({ ...f, novaSenha: e.target.value }))}
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="confirmar">
              Confirmar nova senha
            </label>
            <input
              id="confirmar"
              type={mostrar ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              value={form.confirmar}
              onChange={(e) => setForm((f) => ({ ...f, confirmar: e.target.value }))}
              required
              className={inputClass}
            />
          </div>

          {erro && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}
        </form>
      )}
    </Modal>
  )
}
