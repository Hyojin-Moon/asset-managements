import { normalizeDate, normalizeAmount, type ParsedCardRow } from './card-parser'

/**
 * 삼성카드 엑셀 감지
 * 실제 삼성카드 엑셀 키워드: 승인일자, 가맹점명, 승인금액, 카드번호, 이용일 등
 */
export function detectSamsungCard(data: unknown[][]): boolean {
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i]
    if (!row) continue
    const joined = row.map((c) => String(c ?? '')).join(' ')
    // 실제 삼성카드 형식
    if (/승인일자/.test(joined) && /가맹점명/.test(joined) && /승인금액/.test(joined)) return true
    // 기존 형식도 호환
    if (/삼성카드|삼성/.test(joined) && /이용|가맹점|금액/.test(joined)) return true
    if (/이용일/.test(joined) && /가맹점/.test(joined) && /이용금액/.test(joined)) return true
  }
  return false
}

/**
 * 삼성카드 엑셀 파싱 (실제 형식)
 *
 * 국내이용내역 컬럼:
 * 카드번호 | 본인가족구분 | 승인일자 | 승인시각 | 가맹점명 | 승인금액(원) | 일시불할부구분 | 할부개월 | 승인번호 | 취소여부 | 사용포인트 | 결제일
 *
 * 해외이용내역 컬럼:
 * 카드번호 | 취소구분 | 본인가족구분 | 승인일자 | 승인시각 | 업종 | 가맹점명 | 승인금액(USD) | 현지이용금액 | 현지거래통화 | 승인번호
 */
export function parseSamsungCard(data: unknown[][]): ParsedCardRow[] {
  const rows: ParsedCardRow[] = []
  let headerIdx = -1
  let dateCol = -1
  let merchantCol = -1
  let amountCol = -1
  let cancelCol = -1
  let isOverseas = false

  // 헤더 행 찾기
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const row = data[i]
    if (!row) continue

    // 각 행에서 컬럼 매핑 시도
    dateCol = -1
    merchantCol = -1
    amountCol = -1
    cancelCol = -1

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? '').trim()

      // 날짜 컬럼
      if (/^승인일자$|^이용일(자)?$|^이용일시$|^거래일$/.test(cell) && dateCol === -1) {
        dateCol = j
      }
      // 가맹점 컬럼
      if (/^가맹점(명)?$|^이용가맹점$|이용처|상호명/.test(cell) && merchantCol === -1) {
        merchantCol = j
      }
      // 금액 컬럼 (국내: 승인금액(원), 해외: 승인금액(USD))
      if (/승인금액|이용금액|결제금액/.test(cell) && amountCol === -1) {
        amountCol = j
        if (/USD|달러|해외/.test(cell)) isOverseas = true
      }
      // 취소 컬럼 (국내: 취소여부, 해외: 취소구분)
      if (/취소여부|취소구분/.test(cell) && cancelCol === -1) {
        cancelCol = j
      }
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

    // 취소 건 스킵
    if (cancelCol >= 0) {
      const cancelVal = String(row[cancelCol] ?? '').trim()
      // 국내: "-" = 정상, 해외: "" = 정상. 그 외(취소 등)는 스킵
      if (cancelVal && cancelVal !== '-' && cancelVal !== '') continue
    }

    const dateVal = normalizeDate(row[dateCol])
    const merchant = String(row[merchantCol] ?? '').trim()
    const amount = normalizeAmount(row[amountCol])

    if (!dateVal || !merchant || amount <= 0) continue

    // 행 전체 텍스트로 취소 건 추가 체크
    const rowText = row.map((c) => String(c ?? '')).join(' ')
    if (/취소$/.test(rowText.trim())) continue

    rows.push({
      transactionDate: dateVal,
      merchantName: merchant,
      amount,
      isOverseas,
      originalData: Object.fromEntries(row.map((v, idx) => [String(idx), v])),
    })
  }

  return rows
}
