'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { setRememberMe, setSavedEmail, getSavedEmail } from '@/lib/auth-utils'

export default function LoginPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [rememberMeChecked, setRememberMeChecked] = useState(false)
  const [saveEmailChecked, setSaveEmailChecked] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // 컴포넌트 마운트 시 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = getSavedEmail()
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }))
      setSaveEmailChecked(true)
    }
  }, [])

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
        // 이메일 저장 처리
        setSavedEmail(saveEmailChecked ? formData.email : null)

        // 로그인 상태 유지 처리
        setRememberMe(rememberMeChecked)

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <Link href="/" className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 rounded-lg"></div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Menualic</h1>
          </Link>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-bold text-gray-900">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            아직 계정이 없으신가요?{' '}
            <Link href="/signup" className="font-medium text-primary-600 hover:text-primary-500">
              회원가입하기
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMeChecked}
                onChange={(e) => setRememberMeChecked(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                로그인 상태 유지 (30일)
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="saveEmail"
                name="saveEmail"
                type="checkbox"
                checked={saveEmailChecked}
                onChange={(e) => setSaveEmailChecked(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="saveEmail" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                이메일 저장
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            로그인
          </Button>
        </form>
      </div>
    </div>
  )
}
