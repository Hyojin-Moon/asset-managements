import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Cron configuration is missing required secrets')
    return NextResponse.json(
      { error: 'Cron is not configured' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthStart = `${month}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`

  const { data: budgetItems, error: fetchError } = await supabase
    .from('budget_items')
    .select('*')
    .eq('is_active', true)
    .eq('auto_generate', true)
    .lte('effective_from', monthStart)
    .or(`effective_until.is.null,effective_until.gte.${monthStart}`)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!budgetItems || budgetItems.length === 0) {
    return NextResponse.json({ success: true, month, created: 0, skipped: 0 })
  }

  const ids = budgetItems.map((b) => b.id)

  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('budget_item_id')
    .in('budget_item_id', ids)
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)

  const existingSet = new Set(
    (existingTransactions ?? []).map((t) => t.budget_item_id)
  )

  const newTransactions = budgetItems
    .filter((b) => !existingSet.has(b.id))
    .map((b) => ({
      family_id: b.family_id,
      type: b.type,
      category_id: b.category_id || null,
      person_type: b.person_type,
      description: b.name,
      amount: b.amount,
      transaction_date: monthStart,
      is_emergency: false,
      budget_item_id: b.id,
      memo: b.type === 'income' ? '고정수입 자동생성' : '고정지출 자동생성',
      created_by: null,
    }))

  const skipped = budgetItems.length - newTransactions.length

  if (newTransactions.length === 0) {
    return NextResponse.json({ success: true, month, created: 0, skipped })
  }

  const { error: insertError } = await supabase
    .from('transactions')
    .insert(newTransactions)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    month,
    created: newTransactions.length,
    skipped,
  })
}
