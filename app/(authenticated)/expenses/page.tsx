import { getBudgetItems } from '@/lib/actions/budget'
import { getCategories } from '@/lib/actions/categories'
import { ExpensesClient } from './expenses-client'

export default async function ExpensesPage() {
  const [items, categories] = await Promise.all([
    getBudgetItems({ type: 'expense' }),
    getCategories(),
  ])

  const itemsKey = items.map((item) => `${item.id}:${item.updated_at}:${item.sort_order}`).join('|')
  return <ExpensesClient key={itemsKey} items={items} categories={categories} />
}
