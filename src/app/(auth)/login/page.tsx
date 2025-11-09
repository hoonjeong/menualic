'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요'
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
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error(result.error || '로그인에 실패했습니다')
      } else if (result?.ok) {
        toast.success('로그인 성공!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      toast.error('로그인 중 오류가 발생했습니다')
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
            로그인
          </h2>
          <p className="mt-3 text-center text-sm text-dark-300">
            아직 계정이 없으신가요?{' '}
            <Link href="/signup" className="font-medium text-accent-purple-light hover:text-accent-purple transition-colors">
              회원가입하기
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
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <div className="flex items-center justify-end">
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-accent-purple-light hover:text-accent-purple transition-colors">
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              로그인
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
