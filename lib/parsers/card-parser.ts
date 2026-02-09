import type { CardProvider } from '@/types'
import { parseSamsungCard, detectSamsungCard } from './samsung-card'
import { parseKBCard, detectKBCard } from './kb-card'

export interface ParsedCardRow {
  transactionDate: string    // YYYY-MM-DD
  merchantName: string
  amount: number
  isOverseas?: boolean
  originalData: Record<string, unknown>
}

export interface CardParser {
  parse(data: unknown[][]): ParsedCardRow[]
  detect(data: unknown[][]): boolean
}

/**
 * 카드사 자동 감지 후 파싱
 * provider가 지정되면 해당 파서 사용, 아니면 자동 감지
 */
export function parseCardStatement(
  sheetData: unknown[][],
  provider?: CardProvider
): { rows: ParsedCardRow[]; detectedProvider: CardProvider } {
  if (provider === 'samsung') {
    return { rows: parseSamsungCard(sheetData), detectedProvider: 'samsung' }
  }
  if (provider === 'kb') {
    return { rows: parseKBCard(sheetData), detectedProvider: 'kb' }
  }

  // 자동 감지
  if (detectSamsungCard(sheetData)) {
    return { rows: parseSamsungCard(sheetData), detectedProvider: 'samsung' }
  }
  if (detectKBCard(sheetData)) {
    return { rows: parseKBCard(sheetData), detectedProvider: 'kb' }
  }

  // 감지 실패 시 범용 파서 시도
  return { rows: parseGeneric(sheetData), detectedProvider: 'other' }
}

/**
 * 범용 파서: 날짜/가맹점/금액 컬럼을 휴리스틱으로 찾음
 */
function parseGeneric(data: unknown[][]): ParsedCardRow[] {
  const rows: ParsedCardRow[] = []
  let headerIdx = -1
  let dateCol = -1
  let nameCol = -1
  let amountCol = -1

  // 헤더 찾기
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const row = data[i]
    if (!row) continue
    const joined = row.map((c) => String(c ?? '').trim()).join(' ')

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? '').trim()
      if (/이용일|거래일|승인일|일자/.test(cell) && dateCol === -1) dateCol = j
      if (/가맹점|이용처|상호/.test(cell) && nameCol === -1) nameCol = j
      if (/이용금액|거래금액|승인금액|금액/.test(cell) && amountCol === -1) amountCol = j
    }

    if (dateCol >= 0 && nameCol >= 0 && amountCol >= 0) {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) return rows

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue

    const dateVal = normalizeDate(row[dateCol])
    const merchant = String(row[nameCol] ?? '').trim()
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

/** 날짜 정규화: 다양한 포맷 → YYYY-MM-DD */
export function normalizeDate(val: unknown): string | null {
  if (!val) return null
  const s = String(val).trim()

  // Excel serial date number
  if (/^\d{5}$/.test(s)) {
    const d = new Date((Number(s) - 25569) * 86400 * 1000)
    if (!isNaN(d.getTime())) {
      return formatDateStr(d)
    }
  }

  // YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD
  const full = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (full) {
    return `${full[1]}-${full[2].padStart(2, '0')}-${full[3].padStart(2, '0')}`
  }

  // MM-DD, MM.DD, MM/DD (현재 연도 가정)
  const short = s.match(/^(\d{1,2})[.\-/](\d{1,2})$/)
  if (short) {
    const year = new Date().getFullYear()
    return `${year}-${short[1].padStart(2, '0')}-${short[2].padStart(2, '0')}`
  }

  // YYYYMMDD
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`
  }

  return null
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 금액 정규화: 콤마 제거, 음수/취소 처리 */
export function normalizeAmount(val: unknown): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return Math.abs(val)
  const s = String(val).replace(/[,\s원]/g, '').trim()
  const n = parseInt(s, 10)
  return isNaN(n) ? 0 : Math.abs(n)
}
