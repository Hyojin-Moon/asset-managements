import { getSavingsAccounts } from '@/lib/actions/savings'
import { SavingsClient } from './savings-client'

export default async function SavingsPage() {
  const accounts = await getSavingsAccounts()
  return <SavingsClient initialAccounts={accounts} />
}
