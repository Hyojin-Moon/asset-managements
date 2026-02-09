import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { PERSON_EMOJI } from '@/lib/utils/constants'
import type { PersonType } from '@/types'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 프로필 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, person_type')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name || user.email?.split('@')[0] || '사용자'
  const personType = (profile?.person_type || '효진') as PersonType
  const personEmoji = PERSON_EMOJI[personType]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar displayName={displayName} personEmoji={personEmoji} />

      {/* Main content */}
      <main className="lg:ml-60 pb-20 lg:pb-0">
        <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
