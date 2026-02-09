import { getCategories } from '@/lib/actions/categories'
import { NewTransactionClient } from './new-client'

export default async function NewTransactionPage() {
  const categories = await getCategories()
  return <NewTransactionClient categories={categories} />
}
