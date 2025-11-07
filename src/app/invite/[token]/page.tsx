'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface Invitation {
  id: string
  email: string
  role: string
  team: {
    id: string
    name: string
    description?: string
  }
  sender: {
    name: string
  }
  expiresAt: string
}

export default function InvitePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (token) {
      fetchInvitation()
    }
  }, [token])

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invite/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '초대 정보를 불러올 수 없습니다')
      }

      setInvitation(data.invitation)
    } catch (error) {
      setError(error instanceof Error ? error.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!session?.user) {
      // Redirect to login with callback to this page
      router.push(`/login?callbackUrl=/invite/${token}`)
      return
    }

    setAccepting(true)
    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '초대 수락에 실패했습니다')
      }

      alert('팀에 성공적으로 참여했습니다!')
      router.push('/dashboard')
    } catch (error) {
      alert(error instanceof Error ? error.message : '초대 수락에 실패했습니다')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">초대 정보를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">초대 링크 오류</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push('/login')}>로그인 페이지로</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  const roleText = invitation.role === 'OWNER' ? '소유자' : invitation.role === 'EDITOR' ? '편집자' : '뷰어'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-primary-600 rounded-lg"></div>
            <h1 className="text-2xl font-bold text-gray-900 ml-2">Menualic</h1>
          </div>

          {/* Invitation Info */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">팀 초대</h2>
            <p className="text-gray-600">
              <span className="font-semibold">{invitation.sender.name}</span>님이 팀에 초대했습니다
            </p>
          </div>

          {/* Team Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">팀 이름</label>
                <p className="text-lg font-semibold text-gray-900">{invitation.team.name}</p>
              </div>
              {invitation.team.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">팀 설명</label>
                  <p className="text-gray-700">{invitation.team.description}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">초대받은 이메일</label>
                <p className="text-gray-900">{invitation.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">역할</label>
                <p className="text-gray-900">{roleText}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">만료일</label>
                <p className="text-gray-900">
                  {new Date(invitation.expiresAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {status === 'authenticated' ? (
            <div className="space-y-3">
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full"
                size="lg"
              >
                {accepting ? '참여 중...' : '팀에 참여하기'}
              </Button>
              <p className="text-sm text-gray-500 text-center">
                현재 <span className="font-medium">{session.user?.email}</span>로 로그인되어 있습니다
              </p>
              {session.user?.email !== invitation.email && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ 로그인된 계정이 초대받은 이메일과 다릅니다. 초대받은 계정으로 로그인해주세요.
                  </p>
                </div>
              )}
            </div>
          ) : status === 'unauthenticated' ? (
            <div className="space-y-3">
              <Button
                onClick={() => router.push(`/login?callbackUrl=/invite/${token}`)}
                className="w-full"
                size="lg"
              >
                로그인하여 참여하기
              </Button>
              <p className="text-sm text-gray-500 text-center">
                또는{' '}
                <button
                  onClick={() => router.push(`/signup?callbackUrl=/invite/${token}`)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  회원가입
                </button>
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              이 초대 링크는 초대받은 이메일 주소로만 사용할 수 있습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
