import { getCategories } from '@/lib/actions/categories'
import { getMappingRules } from '@/lib/actions/settings'
import { getProfile } from '@/lib/actions/auth'
import { getConnection, getSubscriptions } from '@/lib/actions/google-calendar'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const [categories, mappingRules, profile, googleConnection, googleSubs] = await Promise.all([
    getCategories(),
    getMappingRules(),
    getProfile(),
    getConnection(),
    getSubscriptions(),
  ])

  return (
    <SettingsClient
      categories={categories}
      mappingRules={mappingRules}
      profile={profile}
      googleConnection={googleConnection}
      googleSubscriptions={googleSubs}
    />
  )
}
