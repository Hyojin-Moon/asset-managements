'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  ActionResult,
  CreateSavingsAccountInput,
  CreateSavingsTransactionInput,
  SavingsAccount,
  SavingsTransaction,
} from '@/types'

async function getFamilyId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  return profile?.family_id ?? null
}

export async function getSavingsAccounts(): Promise<SavingsAccount[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('savings_accounts')
    .select('*')
    .eq('is_active', true)
    .order('person_type', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getSavingsAccounts error:', error)
    return []
  }

  return data ?? []
}

export async function createSavingsAccount(data: CreateSavingsAccountInput): Promise<ActionResult> {
  const supabase = await createClient()
  const familyId = await getFamilyId()
  if (!familyId) return { success: false, error: '인증이 필요합니다.' }

  const { error } = await supabase.from('savings_accounts').insert({
    family_id: familyId,
    name: data.name,
    person_type: data.person_type,
    target_amount: data.target_amount,
    current_balance: 0,
    description: data.description || null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/savings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateSavingsAccount(
  id: string,
  data: Partial<CreateSavingsAccountInput>
): Promise<ActionResult> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.person_type !== undefined) updateData.person_type = data.person_type
  if (data.target_amount !== undefined) updateData.target_amount = data.target_amount
  if (data.description !== undefined) updateData.description = data.description || null

  const { error } = await supabase
    .from('savings_accounts')
    .update(updateData)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/savings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteSavingsAccount(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('savings_accounts')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/savings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getSavingsTransactions(accountId: string): Promise<SavingsTransaction[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('savings_transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getSavingsTransactions error:', error)
    return []
  }

  return data ?? []
}

export async function createSavingsTransaction(data: CreateSavingsTransactionInput): Promise<ActionResult> {
  const supabase = await createClient()
  const familyId = await getFamilyId()
  if (!familyId) return { success: false, error: '인증이 필요합니다.' }

  // Insert the transaction
  const { error: txError } = await supabase.from('savings_transactions').insert({
    account_id: data.account_id,
    family_id: familyId,
    amount: data.amount,
    description: data.description || null,
    transaction_date: data.transaction_date,
  })

  if (txError) return { success: false, error: txError.message }

  // Update the account balance
  const { data: account } = await supabase
    .from('savings_accounts')
    .select('current_balance')
    .eq('id', data.account_id)
    .single()

  if (account) {
    const newBalance = account.current_balance + data.amount
    await supabase
      .from('savings_accounts')
      .update({ current_balance: newBalance })
      .eq('id', data.account_id)
  }

  revalidatePath('/savings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteSavingsTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // First get the transaction to know amount and account
  const { data: tx } = await supabase
    .from('savings_transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (!tx) return { success: false, error: '거래를 찾을 수 없습니다.' }

  // Delete the transaction
  const { error } = await supabase
    .from('savings_transactions')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  // Reverse the balance change
  const { data: account } = await supabase
    .from('savings_accounts')
    .select('current_balance')
    .eq('id', tx.account_id)
    .single()

  if (account) {
    const newBalance = account.current_balance - tx.amount
    await supabase
      .from('savings_accounts')
      .update({ current_balance: newBalance })
      .eq('id', tx.account_id)
  }

  revalidatePath('/savings')
  revalidatePath('/dashboard')
  return { success: true }
}
