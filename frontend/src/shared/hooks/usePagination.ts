import { useState, useMemo } from 'react'

export interface UsePaginationReturn<T> {
  /** Itens da página atual */
  paginatedItems: T[]
  /** Página atual (1-based) */
  page: number
  setPage: (p: number) => void
  /** Itens por página */
  perPage: number
  setPerPage: (n: number) => void
  /** Total de páginas */
  totalPages: number
  /** Total de itens no array original */
  totalItems: number
  /** Volta para a primeira página */
  resetPage: () => void
}

export function usePagination<T>(items: T[], defaultPerPage = 20): UsePaginationReturn<T> {
  const [page, setPageRaw] = useState(1)
  const [perPage, setPerPageRaw] = useState(defaultPerPage)

  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  // Clamp to valid range — handles filter changes that reduce total pages
  const safePage = Math.max(1, Math.min(page, totalPages))

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * perPage
    return items.slice(start, start + perPage)
  }, [items, safePage, perPage])

  function setPage(p: number) {
    setPageRaw(Math.max(1, Math.min(p, totalPages)))
  }

  function setPerPage(n: number) {
    setPerPageRaw(n)
    setPageRaw(1) // reset to first page when page size changes
  }

  function resetPage() {
    setPageRaw(1)
  }

  return {
    paginatedItems,
    page: safePage,
    setPage,
    perPage,
    setPerPage,
    totalPages,
    totalItems: items.length,
    resetPage,
  }
}
