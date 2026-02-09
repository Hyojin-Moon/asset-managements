import { getTransactions } from '@/lib/actions/transactions'
import { getCategories } from '@/lib/actions/categories'
import { TransactionsClient } from './transactions-client'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const month = params.month || new Date().toISOString().slice(0, 7)
  const page = parseInt(params.page || '1', 10)

  const [{ data: transactions, count }, categories] = await Promise.all([
    getTransactions({
      month,
      personType: params.person as never,
      categoryId: params.category,
      type: params.type as never,
      search: params.search,
      page,
      pageSize: 30,
    }),
    getCategories(),
  ])

  return (
    <TransactionsClient
      transactions={transactions}
      categories={categories}
      totalCount={count}
      currentMonth={month}
      currentPage={page}
    />
  )
}
