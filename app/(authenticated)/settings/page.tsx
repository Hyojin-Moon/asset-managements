import { getCategories } from '@/lib/actions/categories'
import { getMappingRules } from '@/lib/actions/settings'
import { getProfile } from '@/lib/actions/auth'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const [categories, mappingRules, profile] = await Promise.all([
    getCategories(),
    getMappingRules(),
    getProfile(),
  ])

  return (
    <SettingsClient
      categories={categories}
      mappingRules={mappingRules}
      profile={profile}
    />
  )
}
