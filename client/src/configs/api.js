// configs/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_BASEURL || 'http://localhost:5000',
})

console.log('🔗 API base URL:', api.defaults.baseURL)

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('🔑 Adding token to request:', token.substring(0, 20) + '...')
    }
    console.log('🌐 Making API request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API response success:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('❌ API response error:', error.response?.status, error.config?.url, error.response?.data)
    return Promise.reject(error)
  }
)

export default api