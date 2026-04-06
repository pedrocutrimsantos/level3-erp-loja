import axios from 'axios'

// Em desenvolvimento: Vite faz proxy de /api para localhost:8080
// Em produção: VITE_API_URL aponta para o backend no Railway (ex: https://backend.railway.app)
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor de request: injeta Bearer token se disponível
api.interceptors.request.use((config) => {
  // Lê diretamente do localStorage para evitar dependência circular com o store Zustand
  const raw = localStorage.getItem('auth')
  if (raw) {
    try {
      const { state } = JSON.parse(raw) as { state: { token: string | null } }
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    } catch {
      // JSON inválido — ignora
    }
  }
  return config
})

// Interceptor de response: rejeita HTML e redireciona 401 para login
api.interceptors.response.use(
  (r) => {
    const ct = r.headers['content-type'] ?? ''
    if (ct.includes('text/html')) {
      return Promise.reject(new Error('API indisponível: verifique a configuração do servidor.'))
    }
    return r
  },
  (err) => {
    if (!err.response) {
      // Sem resposta: rede ou backend fora do ar
      return Promise.reject(new Error('Sem conexão com o servidor.'))
    }
    if (err.response.status === 401) {
      // Token expirado ou inválido — limpa sessão e vai para login
      // Exceção: a própria rota de login não deve redirecionar
      const url = err.config?.url ?? ''
      if (!url.includes('/auth/login')) {
        localStorage.removeItem('auth')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)
