import { createClient } from '@/lib/supabase/server'
import { MoreClient } from './more-client'
import { PERSON_EMOJI } from '@/lib/utils/constants'
import type { PersonType } from '@/types'

export default async function MorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let displayName = '사용자'
  let personType: PersonType = '효진'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, person_type')
      .eq('id', user.id)
      .single()

    if (profile) {
      displayName = profile.display_name || user.email?.split('@')[0] || '사용자'
      personType = (profile.person_type || '효진') as PersonType
    }
  }

  return (
    <MoreClient
      displayName={displayName}
      personType={personType}
      personEmoji={PERSON_EMOJI[personType]}
    />
  )
}
