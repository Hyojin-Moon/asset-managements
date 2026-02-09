import { getBudgetItems } from '@/lib/actions/budget'
import { IncomeClient } from './income-client'

export default async function IncomePage() {
  const items = await getBudgetItems({ type: 'income' })

  return <IncomeClient items={items} />
}
