'use client'

/**
 * Login Page Component
 * 
 * Displays multiple authentication options and handles login flow.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.8
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  signInWithGoogle, 
  signInWithFeishu, 
  signInWithWeChat,
  sendEmailOTP 
} from '@/lib/auth/gate-auth'
import { Mail, Chrome, MessageSquare, Smartphone, AlertCircle, Loader2 } from 'lucide-react'

type AuthMethod = 'google' | 'email' | 'feishu' | 'wechat'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<AuthMethod | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const supabase = createClient()

  // Handle OAuth errors from callback
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    if (errorParam) {
      setError(errorDescription || 'Authentication failed. Please try again.')
    }
  }, [searchParams])

  /**
   * Handle Google OAuth login
   * Requirement: 1.1
   */
  const handleGoogleLogin = async () => {
    setLoading('google')
    setError(null)

    const { url, error } = await signInWithGoogle(supabase)

    if (error) {
      setError(error.message)
      setLoading(null)
      return
    }

    if (url) {
      window.location.href = url
    }
  }

  /**
   * Handle Feishu OAuth login
   * Requirement: 1.3
   */
  const handleFeishuLogin = async () => {
    setLoading('feishu')
    setError(null)

    const { url, error } = await signInWithFeishu(supabase)

    if (error) {
      setError(error.message)
      setLoading(null)
      return
    }

    if (url) {
      window.location.href = url
    }
  }

  /**
   * Handle WeChat login
   * Requirement: 1.4
   */
  const handleWeChatLogin = async () => {
    setLoading('wechat')
    setError(null)

    const { url, error } = await signInWithWeChat(supabase)

    if (error) {
      setError(error.message)
      setLoading(null)
      return
    }

    if (url) {
      window.location.href = url
    }
  }

  /**
   * Handle Email OTP login
   * Requirement: 1.2
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('email')
    setEmailError(null)

    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address')
      setLoading(null)
      return
    }

    const { success, error } = await sendEmailOTP(supabase, { email })

    if (error) {
      setEmailError(error.message)
      setLoading(null)
      return
    }

    if (success) {
      setEmailSent(true)
      setLoading(null)
    }
  }

  /**
   * Retry after error
   * Requirement: 1.8
   */
  const handleRetry = () => {
    setError(null)
    setEmailError(null)
    setEmailSent(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Pocket Room</h1>
          <p className="text-gray-600">A shared space to think, remember, and build.</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Sign in to continue
          </h2>

          {/* Error Display - Requirement 1.8 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-800">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            {/* Google OAuth - Requirement 1.1 */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Chrome className="w-5 h-5" />
              )}
              <span className="font-medium">Continue with Google</span>
            </button>

            {/* Feishu OAuth - Requirement 1.3 */}
            <button
              onClick={handleFeishuLogin}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'feishu' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
              <span className="font-medium">Continue with Feishu</span>
            </button>

            {/* WeChat - Requirement 1.4 */}
            <button
              onClick={handleWeChatLogin}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'wechat' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Smartphone className="w-5 h-5" />
              )}
              <span className="font-medium">Continue with WeChat</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Email OTP Form - Requirement 1.2 */}
          {!emailSent ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading !== null}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>
                {emailError && (
                  <p className="mt-2 text-sm text-red-600">{emailError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading === 'email' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send magic link</span>
                )}
              </button>
            </form>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 mb-1">
                    Check your email
                  </p>
                  <p className="text-sm text-green-700">
                    We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
                  </p>
                  <button
                    onClick={handleRetry}
                    className="mt-3 text-sm font-medium text-green-600 hover:text-green-700 underline"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
