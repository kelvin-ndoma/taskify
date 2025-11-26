// contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import api from '../configs/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  console.log('🔐 AuthProvider initialized', { 
    hasToken: !!token, 
    user, 
    loading 
  })

  // Set auth token for API calls
  useEffect(() => {
    console.log('🔄 AuthProvider useEffect running')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      verifyToken()
    } else {
      console.log('❌ No token found')
      setLoading(false)
    }
  }, [token])

  const verifyToken = async () => {
    try {
      console.log('🔍 Verifying token...')
      const response = await api.get('/api/auth/profile')
      console.log('✅ Token verified, user:', response.data.user)
      setUser(response.data.user)
    } catch (error) {
      console.error('❌ Token verification failed:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      console.log('🚀 Starting login for:', email)
      const response = await api.post('/api/auth/login', { email, password })
      console.log('✅ Login API response:', response.data)
      
      const { user, token } = response.data
      
      localStorage.setItem('token', token)
      setToken(token)
      setUser(user)
      
      console.log('✅ Login successful, user set:', user)
      return { success: true, user }
    } catch (error) {
      console.error('❌ Login error:', error)
      const message = error.response?.data?.message || 'Login failed'
      return { success: false, message }
    }
  }

  const register = async (userData) => {
    try {
      console.log('🚀 Starting registration for:', userData.email)
      const response = await api.post('/api/auth/register', userData)
      console.log('✅ Registration API response:', response.data)
      
      const { user, token, requiresVerification } = response.data
      
      // Only set token and user if email verification is not required
      // or if email is already verified
      if (!requiresVerification) {
        localStorage.setItem('token', token)
        setToken(token)
        setUser(user)
      }
      
      return { 
        success: true, 
        user, 
        requiresVerification,
        message: response.data.message 
      }
    } catch (error) {
      console.error('❌ Registration error:', error)
      const message = error.response?.data?.message || 'Registration failed'
      return { success: false, message }
    }
  }
  

  // 🆕 ADD VERIFY EMAIL FUNCTION
  const verifyEmail = async (email, code) => {
    try {
      console.log('🔐 Verifying email for:', email)
      const response = await api.post('/api/auth/verify-email', { email, code })
      console.log('✅ Email verification response:', response.data)
      
      const { user, token } = response.data
      
      localStorage.setItem('token', token)
      setToken(token)
      setUser(user)
      
      return { success: true, user, message: response.data.message }
    } catch (error) {
      console.error('❌ Email verification error:', error)
      const message = error.response?.data?.message || 'Email verification failed'
      return { success: false, message }
    }
  }

    const updateUser = (updatedUser) => {
        setUser(prevUser => ({
            ...prevUser,
            ...updatedUser
        }));
    };

  const logout = () => {
    console.log('🚪 Logging out...')
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    delete api.defaults.headers.common['Authorization']
  }

  const value = {
    user,
    loading,
    token,
    login,
    register,
    verifyEmail, // 🆕 ADD VERIFY EMAIL TO CONTEXT VALUE
    logout,
    isAuthenticated: !!user,
    getToken: () => token,
    updateUser
  }

  console.log('🔐 AuthProvider value:', value)

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}