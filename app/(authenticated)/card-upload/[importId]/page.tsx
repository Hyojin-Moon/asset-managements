import { getCardImportDetail } from '@/lib/actions/card-upload'
import { getCategories } from '@/lib/actions/categories'
import { CardReviewClient } from './review-client'
import { redirect } from 'next/navigation'

export default async function CardReviewPage({ params }: { params: Promise<{ importId: string }> }) {
  const { importId } = await params
  const [{ importData, rows }, categories] = await Promise.all([
    getCardImportDetail(importId),
    getCategories(),
  ])

  if (!importData) {
    redirect('/card-upload')
  }

  return <CardReviewClient importData={importData} rows={rows} categories={categories} />
}
