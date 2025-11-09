'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get('token')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요'
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다'
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = '비밀번호는 영문과 숫자를 포함해야 합니다'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호를 다시 입력해주세요'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다'
    }

    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요'
    }

    if (!agreedToTerms) {
      newErrors.terms = '이용약관 및 개인정보처리방침에 동의해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          invitationToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '회원가입 중 오류가 발생했습니다')
      }

      toast.success('회원가입이 완료되었습니다!')

      // Auto login
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (signInResult?.ok) {
        if (invitationToken) {
          router.push('/dashboard')
        } else {
          router.push('/team/create')
        }
      } else {
        router.push('/login')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '회원가입에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[e.target.name]
        return newErrors
      })
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background effects */}
      <div className="absolute inset-0 bg-dark-mesh opacity-40"></div>
      <div className="absolute top-20 -left-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-purple to-accent-blue rounded-xl shadow-neon-purple flex items-center justify-center">
              <div className="w-7 h-7 bg-dark-900 rounded-md"></div>
            </div>
            <h1 className="text-3xl font-bold text-gradient">Menualic</h1>
          </Link>
          <h2 className="mt-2 text-center text-3xl font-bold text-white">
            {invitationToken ? '초대받은 팀에 가입하기' : '회원가입'}
          </h2>
          <p className="mt-3 text-center text-sm text-dark-300">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-medium text-accent-purple-light hover:text-accent-purple transition-colors">
              로그인하기
            </Link>
          </p>
        </div>

        <div className="card-glow p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <Input
                label="이메일"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="이메일 주소를 입력하세요"
              />

              <Input
                label="비밀번호"
                name="password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="최소 8자, 영문+숫자 조합"
              />

              <Input
                label="비밀번호 확인"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                placeholder="비밀번호를 다시 입력하세요"
              />

              <Input
                label="이름"
                name="name"
                type="text"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked)
                    if (errors.terms) {
                      setErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.terms
                        return newErrors
                      })
                    }
                  }}
                  className="h-4 w-4 mt-1 rounded border-dark-600 bg-dark-800/50 text-accent-purple focus:ring-accent-purple focus:ring-offset-dark-900"
                />
                <label htmlFor="terms" className="ml-3 block text-sm text-dark-200">
                  <span className="font-medium text-white">이용약관</span> 및{' '}
                  <span className="font-medium text-white">개인정보처리방침</span>에 동의합니다 (필수)
                </label>
              </div>
              {errors.terms && (
                <p className="mt-1.5 text-sm text-red-400">{errors.terms}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              가입하기
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <SignupForm />
    </Suspense>
  )
}
