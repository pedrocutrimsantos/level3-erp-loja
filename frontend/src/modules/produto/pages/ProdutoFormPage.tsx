import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCriarProduto, useUnidadesMedida } from '../hooks/useProdutos'
import { ConversaoMadeiraWidget } from '../components/ConversaoMadeiraWidget'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'

const schema = z
  .object({
    codigo: z.string().min(1, 'Código é obrigatório').max(20, 'Máximo 20 caracteres'),
    descricao: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .max(200, 'Máximo 200 caracteres'),
    tipo: z.enum(['MADEIRA', 'NORMAL']),
    ncm: z.string().length(8, 'NCM deve ter exatamente 8 dígitos'),
    unidadeVendaSigla: z.string().optional(),
    espessuraM: z.number().positive('Deve ser positivo').optional(),
    larguraM: z.number().positive('Deve ser positivo').optional(),
    comprimentoPecaM: z.number().positive('Deve ser positivo').optional(),
    precoVenda: z.number().positive('Deve ser positivo').optional(),
  })
  .refine(
    (data) => {
      if (data.tipo === 'MADEIRA') {
        return data.espessuraM != null && data.larguraM != null
      }
      return true
    },
    {
      message: 'Espessura e largura são obrigatórias para produtos de madeira',
      path: ['espessuraM'],
    }
  )
  .refine(
    (data) => {
      if (data.tipo === 'NORMAL') {
        return !!data.unidadeVendaSigla
      }
      return true
    },
    {
      message: 'Selecione a unidade de venda',
      path: ['unidadeVendaSigla'],
    }
  )

type FormData = z.infer<typeof schema>

export default function ProdutoFormPage() {
  const navigate = useNavigate()
  const { mutate: criar, isPending } = useCriarProduto()
  const { data: unidades } = useUnidadesMedida()

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'NORMAL' },
  })

  const tipo = watch('tipo')
  const espessuraM = watch('espessuraM')
  const larguraM = watch('larguraM')
  const comprimentoPecaM = watch('comprimentoPecaM')
  const isMadeira = tipo === 'MADEIRA'
  const precoLabel = isMadeira ? 'Preço de Venda (R$/metro linear)' : 'Preço de Venda (R$/unidade)'

  // Unidades relevantes para produtos NORMAL (excluir M3 que é interno)
  const unidadesNormal = unidades?.filter((u) => u.codigo !== 'M3') ?? []

  function onSubmit(data: FormData) {
    criar(
      {
        codigo:            data.codigo,
        descricao:         data.descricao,
        tipo:              data.tipo,
        ncm:               data.ncm,
        unidadeVendaSigla: isMadeira ? 'M' : data.unidadeVendaSigla,
        espessuraM:        data.espessuraM,
        larguraM:          data.larguraM,
        comprimentoPecaM:  data.comprimentoPecaM,
        precoVenda:        data.precoVenda,
      },
      {
        onSuccess: () => navigate('/produtos'),
      }
    )
  }

  return (
    <div>
      <PageHeader
        title="Novo Produto"
        subtitle="Cadastre um novo produto no catálogo"
        actions={
          <Button variant="outline" onClick={() => navigate('/produtos')}>
            Cancelar
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={`grid gap-6 ${isMadeira ? 'lg:grid-cols-2' : 'max-w-2xl'}`}>
          {/* Dados principais */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Produto</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input
                  label="Código *"
                  placeholder="Ex: PINUS-25x100"
                  error={errors.codigo?.message}
                  {...register('codigo')}
                />

                <Input
                  label="Descrição *"
                  placeholder="Ex: Pinus Serrado 25×100mm"
                  error={errors.descricao?.message}
                  {...register('descricao')}
                />

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tipo *</label>
                  <Controller
                    name="tipo"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="MADEIRA">Madeira</option>
                      </select>
                    )}
                  />
                  {errors.tipo && (
                    <p className="text-xs text-destructive">{errors.tipo.message}</p>
                  )}
                </div>

                {/* Unidade de venda — somente para NORMAL */}
                {!isMadeira && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Unidade de Venda *
                    </label>
                    <Controller
                      name="unidadeVendaSigla"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="">Selecione…</option>
                          {unidadesNormal.map((u) => (
                            <option key={u.codigo} value={u.codigo}>
                              {u.codigo} — {u.descricao}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.unidadeVendaSigla && (
                      <p className="text-xs text-destructive">
                        {errors.unidadeVendaSigla.message}
                      </p>
                    )}
                  </div>
                )}

                {isMadeira && (
                  <p className="text-xs text-muted-foreground">
                    Madeira: compra em m³ · estoque em metro linear · nota fiscal em m³.
                  </p>
                )}

                <Input
                  label="NCM *"
                  placeholder="8 dígitos — Ex: 44071190"
                  maxLength={8}
                  error={errors.ncm?.message}
                  {...register('ncm')}
                />

                <Input
                  label={precoLabel}
                  type="number"
                  min={0.01}
                  step={0.01}
                  placeholder="Ex: 12,50"
                  error={errors.precoVenda?.message}
                  {...register('precoVenda', { valueAsNumber: true })}
                />
              </CardContent>
            </Card>

            {/* Dimensões — apenas para madeira */}
            {isMadeira && (
              <Card>
                <CardHeader>
                  <CardTitle>Dimensões da Madeira</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Input
                    label="Espessura (m) *"
                    type="number"
                    min={0.001}
                    step={0.001}
                    placeholder="Ex: 0,05 (para 5cm)"
                    error={errors.espessuraM?.message}
                    {...register('espessuraM', { valueAsNumber: true })}
                  />
                  <Input
                    label="Largura (m) *"
                    type="number"
                    min={0.001}
                    step={0.001}
                    placeholder="Ex: 0,20 (para 20cm)"
                    error={errors.larguraM?.message}
                    {...register('larguraM', { valueAsNumber: true })}
                  />
                  <div className="border-t border-border pt-3">
                    <Input
                      label="Comprimento da peça (m) — opcional"
                      type="number"
                      min={0.01}
                      step={0.01}
                      placeholder="Ex: 3,00 (tábuas de 3 metros)"
                      error={errors.comprimentoPecaM?.message}
                      {...register('comprimentoPecaM', { valueAsNumber: true })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Se preenchido, habilita venda e entrada por peça (além de metros lineares).
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Preview de conversão — apenas para madeira */}
          {isMadeira && (
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preview de Conversão</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConversaoMadeiraWidget
                    espessuraM={
                      typeof espessuraM === 'number' && espessuraM > 0 ? espessuraM : null
                    }
                    larguraM={
                      typeof larguraM === 'number' && larguraM > 0 ? larguraM : null
                    }
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" loading={isPending}>
            Salvar Produto
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/produtos')}
            disabled={isPending}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
