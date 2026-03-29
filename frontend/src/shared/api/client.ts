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

// Interceptor: rejeita respostas HTML (nginx retornando index.html para chamadas de API)
// e redireciona 401 para login (preparado para auth futura)
api.interceptors.response.use(
  (r) => {
    const ct = r.headers['content-type'] ?? ''
    if (ct.includes('text/html')) {
      return Promise.reject(new Error('API indisponível: verifique a configuração do servidor.'))
    }
    return r
  },
  (err) => {
    if (err.response?.status === 401) window.location.href = '/login'
    return Promise.reject(err)
  }
)
