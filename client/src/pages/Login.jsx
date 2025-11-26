// pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react' // Added icons
import toast from 'react-hot-toast'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false) // Added state
  
  const { login, user } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        toast.success('Login successful!')
        navigate('/', { replace: true })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex justify-center items-center min-h-screen bg-white dark:bg-zinc-950 p-4'>
      <div className='w-full max-w-md'>
        <div className='bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800 p-8'>
          <div className='text-center mb-8'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
              Welcome Back
            </h1>
            <p className='text-gray-500 dark:text-zinc-400'>
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              <label htmlFor="email" className='block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2'>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className='w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-800 text-gray-900 dark:text-white'
                  placeholder='Enter your email'
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className='block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2'>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name='password'
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className='w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-800 text-gray-900 dark:text-white'
                  placeholder='Enter your password'
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className='mt-6 text-center'>
            <p className='text-gray-600 dark:text-zinc-400'>
              Don't have an account?{' '}
              <Link
                to='/register'
                className='text-blue-600 hover:text-blue-500 font-medium'
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login