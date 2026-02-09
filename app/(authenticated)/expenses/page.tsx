import { getBudgetItems } from '@/lib/actions/budget'
import { getCategories } from '@/lib/actions/categories'
import { ExpensesClient } from './expenses-client'

export default async function ExpensesPage() {
  const [items, categories] = await Promise.all([
    getBudgetItems({ type: 'expense' }),
    getCategories(),
  ])

  return <ExpensesClient items={items} categories={categories} />
}
