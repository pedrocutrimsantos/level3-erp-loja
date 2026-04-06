import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useToastStore } from '@/shared/store/toastStore'
import { cn } from '@/shared/utils/cn'

const icone = {
  erro:    <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />,
  sucesso: <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />,
  info:    <Info className="h-4 w-4 shrink-0 text-primary" />,
}

const estilo = {
  erro:    'border-destructive/30 bg-destructive/10 text-destructive',
  sucesso: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
  info:    'border-primary/30 bg-primary/10 text-primary',
}

export function Toaster() {
  const { toasts, remove } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 md:bottom-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex w-72 items-start gap-2 rounded-lg border px-3 py-2.5 shadow-md text-sm',
            estilo[t.tipo]
          )}
        >
          {icone[t.tipo]}
          <span className="flex-1 leading-snug">{t.mensagem}</span>
          <button
            onClick={() => remove(t.id)}
            className="mt-0.5 opacity-60 hover:opacity-100"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
