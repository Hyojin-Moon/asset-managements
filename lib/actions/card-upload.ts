'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import * as XLSX from 'xlsx'
import { parseCardStatement } from '@/lib/parsers/card-parser'
import type { ActionResult, CardProvider, PersonType } from '@/types'

async function getFamilyId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { familyId: null, userId: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()
  return { familyId: profile?.family_id ?? null, userId: user.id }
}

/**
 * 카드 명세서 업로드 및 파싱
 */
export async function uploadCardStatement(formData: FormData): Promise<ActionResult & { importId?: string }> {
  const file = formData.get('file') as File
  const cardProvider = formData.get('card_provider') as CardProvider
  const personType = formData.get('person_type') as PersonType
  const statementMonth = formData.get('statement_month') as string

  if (!file || !cardProvider || !personType || !statementMonth) {
    return { success: false, error: '모든 필드를 입력해주세요.' }
  }

  const supabase = await createClient()
  const { familyId, userId } = await getFamilyId()
  if (!familyId) return { success: false, error: '인증이 필요합니다.' }

  // 1. 엑셀 파싱 (여러 시트 지원 - 상세 시트 자동 탐색)
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  // 상세 내역 시트 찾기 (삼성카드: 국내이용내역/해외이용내역, 국민: 이용내역 등)
  const detailSheetKeywords = ['이용내역', '거래내역', '명세', '상세']
  let bestSheetName = workbook.SheetNames[0]
  for (const name of workbook.SheetNames) {
    if (detailSheetKeywords.some((kw) => name.includes(kw))) {
      bestSheetName = name
      break
    }
  }

  // 여러 시트에서 파싱 시도 → 가장 많은 행을 반환하는 시트 사용
  let bestRows: ReturnType<typeof parseCardStatement> = { rows: [], detectedProvider: 'other' }
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
    const result = parseCardStatement(sheetData, cardProvider !== 'other' ? cardProvider : undefined)
    if (result.rows.length > bestRows.rows.length) {
      bestRows = result
    }
  }

  const { rows: parsedRows, detectedProvider } = bestRows

  if (parsedRows.length === 0) {
    return { success: false, error: '파싱된 거래가 없습니다. 엑셀 형식을 확인해주세요.' }
  }

  // 2. 자동 카테고리 매칭
  const { data: rules } = await supabase
    .from('category_mapping_rules')
    .select('keyword, category_id, priority')
    .order('priority', { ascending: false })

  const mappingRules = rules ?? []
  let matchedCount = 0

  const rowsWithCategory = parsedRows.map((row) => {
    const matched = matchMerchant(row.merchantName, mappingRules)
    if (matched) matchedCount++
    return {
      ...row,
      categoryId: matched,
      isMatched: !!matched,
    }
  })

  // 3. import 레코드 생성
  const { data: importRecord, error: importError } = await supabase
    .from('card_statement_imports')
    .insert({
      family_id: familyId,
      card_provider: detectedProvider,
      person_type: personType,
      statement_month: `${statementMonth}-01`,
      file_name: file.name,
      total_rows: parsedRows.length,
      matched_rows: matchedCount,
      status: 'reviewing',
      uploaded_by: userId,
    })
    .select('id')
    .single()

  if (importError || !importRecord) {
    return { success: false, error: importError?.message || '업로드 실패' }
  }

  // 4. 파싱된 행 저장
  const cardRows = rowsWithCategory.map((row) => ({
    import_id: importRecord.id,
    family_id: familyId,
    transaction_date: row.transactionDate,
    merchant_name: row.merchantName,
    amount: row.amount,
    category_id: row.categoryId || null,
    is_matched: row.isMatched,
    is_excluded: false,
    original_data: row.originalData,
  }))

  const { error: rowsError } = await supabase
    .from('card_statement_rows')
    .insert(cardRows)

  if (rowsError) {
    return { success: false, error: rowsError.message }
  }

  revalidatePath('/card-upload')
  return { success: true, importId: importRecord.id }
}

/**
 * 가맹점명으로 카테고리 매칭
 */
function matchMerchant(
  merchantName: string,
  rules: { keyword: string; category_id: string; priority: number }[]
): string | null {
  const lower = merchantName.toLowerCase()
  for (const rule of rules) {
    if (lower.includes(rule.keyword.toLowerCase())) {
      return rule.category_id
    }
  }
  return null
}

/**
 * import 상세 조회
 */
export async function getCardImportDetail(importId: string) {
  const supabase = await createClient()

  const [{ data: importData }, { data: rows }] = await Promise.all([
    supabase
      .from('card_statement_imports')
      .select('*')
      .eq('id', importId)
      .single(),
    supabase
      .from('card_statement_rows')
      .select('*, expense_categories(name)')
      .eq('import_id', importId)
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const mappedRows = (rows ?? []).map((row) => ({
    ...row,
    category_name: ((row.expense_categories as unknown) as { name: string } | null)?.name ?? null,
  }))

  return { importData, rows: mappedRows }
}

/**
 * 개별 행 카테고리 수정
 */
export async function updateCardRowCategory(
  rowId: string,
  categoryId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('card_statement_rows')
    .update({ category_id: categoryId, is_matched: true })
    .eq('id', rowId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/card-upload')
  return { success: true }
}

/**
 * 행 제외 토글
 */
export async function toggleCardRowExclusion(rowId: string, excluded: boolean): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('card_statement_rows')
    .update({ is_excluded: excluded })
    .eq('id', rowId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/card-upload')
  return { success: true }
}

/**
 * 카드 명세서 확정 → 거래내역 변환
 */
export async function confirmCardImport(importId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { familyId, userId } = await getFamilyId()
  if (!familyId) return { success: false, error: '인증이 필요합니다.' }

  // import 정보 가져오기
  const { data: importData } = await supabase
    .from('card_statement_imports')
    .select('person_type, card_provider')
    .eq('id', importId)
    .single()

  if (!importData) return { success: false, error: 'Import를 찾을 수 없습니다.' }

  // 미제외 행 가져오기
  const { data: rows } = await supabase
    .from('card_statement_rows')
    .select('*')
    .eq('import_id', importId)
    .eq('is_excluded', false)

  if (!rows || rows.length === 0) {
    return { success: false, error: '확정할 거래가 없습니다.' }
  }

  // transactions로 변환
  const transactions = rows.map((row) => ({
    family_id: familyId,
    type: 'expense' as const,
    category_id: row.category_id,
    person_type: importData.person_type,
    description: row.merchant_name,
    amount: row.amount,
    transaction_date: row.transaction_date,
    is_emergency: false,
    card_provider: importData.card_provider,
    card_statement_row_id: row.id,
    created_by: userId,
  }))

  const { error: txError } = await supabase.from('transactions').insert(transactions)
  if (txError) return { success: false, error: txError.message }

  // import 상태 업데이트
  const { error: updateError } = await supabase
    .from('card_statement_imports')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', importId)

  if (updateError) return { success: false, error: updateError.message }

  revalidatePath('/card-upload')
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * 자동분류 규칙 저장
 */
export async function saveMappingRule(data: {
  keyword: string
  categoryId: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { familyId } = await getFamilyId()
  if (!familyId) return { success: false, error: '인증이 필요합니다.' }

  const { error } = await supabase
    .from('category_mapping_rules')
    .upsert({
      family_id: familyId,
      keyword: data.keyword,
      category_id: data.categoryId,
      priority: 10,
    }, { onConflict: 'family_id,keyword' })

  if (error) return { success: false, error: error.message }
  revalidatePath('/card-upload')
  revalidatePath('/settings')
  return { success: true }
}

/**
 * 리뷰중인 카드 명세서 삭제
 */
export async function deleteCardImport(importId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // reviewing 상태인지 확인
  const { data: importData } = await supabase
    .from('card_statement_imports')
    .select('status')
    .eq('id', importId)
    .single()

  if (!importData) return { success: false, error: 'Import를 찾을 수 없습니다.' }
  if (importData.status !== 'reviewing') {
    return { success: false, error: '리뷰중인 내역만 삭제할 수 있습니다.' }
  }

  // card_statement_rows는 ON DELETE CASCADE로 자동 삭제
  const { error } = await supabase
    .from('card_statement_imports')
    .delete()
    .eq('id', importId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/card-upload')
  return { success: true }
}

/**
 * 업로드 이력 조회
 */
export async function getCardImportHistory() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('card_statement_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('getCardImportHistory error:', error)
    return []
  }

  return data ?? []
}
