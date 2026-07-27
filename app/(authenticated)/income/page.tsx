import { getBudgetItems } from '@/lib/actions/budget'
import { IncomeClient } from './income-client'

export default async function IncomePage() {
  const items = await getBudgetItems({ type: 'income' })

  const itemsKey = items.map((item) => `${item.id}:${item.updated_at}:${item.sort_order}`).join('|')
  return <IncomeClient key={itemsKey} items={items} />
}
