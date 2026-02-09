import { normalizeDate, normalizeAmount, type ParsedCardRow } from './card-parser'

/**
 * 국민카드 엑셀 감지
 * 키워드: 국민카드, KB, 이용일자, 이용가맹점
 */
export function detectKBCard(data: unknown[][]): boolean {
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i]
    if (!row) continue
    const joined = row.map((c) => String(c ?? '')).join(' ')
    if (/국민카드|KB|kb/.test(joined) && /이용|가맹점|금액/.test(joined)) return true
    if (/이용일자/.test(joined) && /이용가맹점|가맹점/.test(joined)) return true
  }
  return false
}

/**
 * 국민카드 엑셀 파싱
 *
 * 예상 컬럼 구조:
 * 이용일자 | 이용가맹점 | 업종 | 이용금액 | 결제(예정)금액 | 결제상태
 * 또는
 * 이용일자 | 가맹점명 | 이용금액 | ...
 */
export function parseKBCard(data: unknown[][]): ParsedCardRow[] {
  const rows: ParsedCardRow[] = []
  let headerIdx = -1
  let dateCol = -1
  let merchantCol = -1
  let amountCol = -1
  let statusCol = -1

  // 헤더 행 찾기
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const row = data[i]
    if (!row) continue

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? '').trim()
      if (/^이용일(자)?$|^거래일(자)?$/.test(cell) && dateCol === -1) dateCol = j
      if (/가맹점(명)?$|이용가맹점|이용처/.test(cell) && merchantCol === -1) merchantCol = j
      if (/이용금액$|이용\s?금액$|거래금액/.test(cell) && amountCol === -1) amountCol = j
      if (/결제상태|상태/.test(cell) && statusCol === -1) statusCol = j
    }

    if (dateCol >= 0 && merchantCol >= 0 && amountCol >= 0) {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) return rows

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue

    // 결제상태가 '취소'인 건 스킵
    if (statusCol >= 0) {
      const status = String(row[statusCol] ?? '').trim()
      if (/취소/.test(status)) continue
    }

    const dateVal = normalizeDate(row[dateCol])
    const merchant = String(row[merchantCol] ?? '').trim()
    const amount = normalizeAmount(row[amountCol])

    if (!dateVal || !merchant || amount <= 0) continue

    rows.push({
      transactionDate: dateVal,
      merchantName: merchant,
      amount,
      originalData: Object.fromEntries(row.map((v, idx) => [String(idx), v])),
    })
  }

  return rows
}
