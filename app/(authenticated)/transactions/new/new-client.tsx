'use client'

import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card } from '@/components/ui/card'
import { TransactionForm } from '@/components/transactions/transaction-form'
import type { ExpenseCategory } from '@/types'

export function NewTransactionClient({ categories }: { categories: ExpenseCategory[] }) {
  const router = useRouter()

  return (
    <div className="max-w-lg mx-auto">
      <Header title="거래 추가" />
      <Card>
        <TransactionForm
          categories={categories}
          onSuccess={() => router.push('/transactions')}
          onCancel={() => router.back()}
        />
      </Card>
    </div>
  )
}
