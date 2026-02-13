'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import {
  updateCardRowCategory,
  toggleCardRowExclusion,
  confirmCardImport,
  saveMappingRule,
  deleteCardImport,
} from '@/lib/actions/card-upload'
import { formatKRW } from '@/lib/utils/format'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Tag,
  Eye,
  EyeOff,
  BookmarkPlus,
  Check,
  ArrowLeft,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { CardStatementImport, CardStatementRow, ExpenseCategory } from '@/types'

type FilterType = 'all' | 'matched' | 'unmatched' | 'excluded'

export function CardReviewClient({
  importData,
  rows: initialRows,
  categories,
}: {
  importData: CardStatementImport
  rows: CardStatementRow[]
  categories: ExpenseCategory[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState<CardStatementRow[]>(initialRows)
  const [filter, setFilter] = useState<FilterType>('all')
  const [confirmPending, setConfirmPending] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [ruleModal, setRuleModal] = useState<{ rowId: string; merchantName: string; categoryId: string } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePending, setDeletePending] = useState(false)

  const isConfirmed = importData.status === 'confirmed'

  // 필터된 행
  const filteredRows = useMemo(() => {
    switch (filter) {
      case 'matched':
        return rows.filter((r) => r.is_matched && !r.is_excluded)
      case 'unmatched':
        return rows.filter((r) => !r.is_matched && !r.is_excluded)
      case 'excluded':
        return rows.filter((r) => r.is_excluded)
      default:
        return rows
    }
  }, [rows, filter])

  // 통계
  const stats = useMemo(() => {
    const active = rows.filter((r) => !r.is_excluded)
    const matched = active.filter((r) => r.is_matched)
    const unmatched = active.filter((r) => !r.is_matched)
    const excluded = rows.filter((r) => r.is_excluded)
    const totalAmount = active.reduce((s, r) => s + r.amount, 0)
    return {
      total: rows.length,
      active: active.length,
      matched: matched.length,
      unmatched: unmatched.length,
      excluded: excluded.length,
      totalAmount,
    }
  }, [rows])

  // 카테고리 변경
  async function handleCategoryChange(rowId: string, categoryId: string) {
    const result = await updateCardRowCategory(rowId, categoryId)
    if (result.success) {
      const cat = categories.find((c) => c.id === categoryId)
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, category_id: categoryId, category_name: cat?.name ?? null, is_matched: true }
            : r
        )
      )
    } else {
      toast.error(result.error || '카테고리 변경 실패')
    }
  }

  // 제외 토글
  async function handleToggleExclude(rowId: string, excluded: boolean) {
    const result = await toggleCardRowExclusion(rowId, excluded)
    if (result.success) {
      setRows((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, is_excluded: excluded } : r))
      )
    } else {
      toast.error(result.error || '변경 실패')
    }
  }

  // 확정
  async function handleConfirm() {
    setConfirmPending(true)
    const result = await confirmCardImport(importData.id)
    if (result.success) {
      toast.success('거래내역으로 변환 완료!')
      router.push('/card-upload')
      router.refresh()
    } else {
      toast.error(result.error || '확정 실패')
    }
    setConfirmPending(false)
    setShowConfirmModal(false)
  }

  // 규칙 저장
  async function handleSaveRule() {
    if (!ruleModal) return
    const result = await saveMappingRule({
      keyword: ruleModal.merchantName,
      categoryId: ruleModal.categoryId,
    })
    if (result.success) {
      toast.success(`"${ruleModal.merchantName}" 자동분류 규칙 저장!`)
    } else {
      toast.error(result.error || '규칙 저장 실패')
    }
    setRuleModal(null)
  }

  async function handleDelete() {
    setDeletePending(true)
    const result = await deleteCardImport(importData.id)
    if (result.success) {
      toast.success('삭제되었습니다')
      router.push('/card-upload')
    } else {
      toast.error(result.error || '삭제 실패')
    }
    setDeletePending(false)
    setShowDeleteModal(false)
  }

  const providerLabel =
    importData.card_provider === 'samsung' ? '삼성카드' : importData.card_provider === 'kb' ? '국민카드' : '기타'

  return (
    <div>
      <Header
        title="카드 내역 리뷰"
        description={`${importData.statement_month.slice(0, 7)} ${providerLabel} · ${importData.file_name}`}
      />

      {/* 상단: 뒤로가기 + 통계 + 확정 버튼 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/card-upload')}>
          <ArrowLeft className="h-4 w-4" /> 목록으로
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          {!isConfirmed && stats.unmatched > 0 && (
            <Badge className="bg-warm-bg text-warm-dark">
              <AlertCircle className="h-3 w-3 mr-1" />
              미분류 {stats.unmatched}건
            </Badge>
          )}
          {isConfirmed ? (
            <Badge className="bg-accent-bg text-accent-dark">
              <CheckCircle className="h-3 w-3 mr-1" /> 확정 완료
            </Badge>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="text-error border-error/30 hover:bg-error/10"
              >
                <Trash2 className="h-4 w-4" /> 삭제
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirmModal(true)}
                disabled={stats.active === 0}
              >
                <CheckCircle className="h-4 w-4" /> 확정 ({stats.active}건 · {formatKRW(stats.totalAmount)})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {([
          { key: 'all', label: `전체 (${stats.total})` },
          { key: 'matched', label: `분류됨 (${stats.matched})` },
          { key: 'unmatched', label: `미분류 (${stats.unmatched})` },
          { key: 'excluded', label: `제외 (${stats.excluded})` },
        ] as { key: FilterType; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab.key
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 거래 목록 */}
      <Card>
        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              해당하는 거래가 없어요
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRows.map((row) => (
                <ReviewRowItem
                  key={row.id}
                  row={row}
                  categories={categories}
                  isConfirmed={isConfirmed}
                  onCategoryChange={handleCategoryChange}
                  onToggleExclude={handleToggleExclude}
                  onSaveRule={(merchantName, categoryId) =>
                    setRuleModal({ rowId: row.id, merchantName, categoryId })
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 확정 확인 모달 */}
      <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="카드 내역 확정">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {stats.active}건의 거래를 거래내역으로 변환합니다.
          </p>
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>총 거래 수</span>
              <span className="font-medium">{stats.active}건</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>분류됨</span>
              <span className="font-medium text-accent-dark">{stats.matched}건</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>미분류</span>
              <span className="font-medium text-warm-dark">{stats.unmatched}건</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>제외</span>
              <span className="font-medium text-muted-foreground">{stats.excluded}건</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-sm font-bold">
              <span>총 금액</span>
              <span>{formatKRW(stats.totalAmount)}</span>
            </div>
          </div>
          {stats.unmatched > 0 && (
            <div className="flex items-start gap-2 text-xs text-warm-dark bg-warm-bg rounded-xl p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>미분류 {stats.unmatched}건은 카테고리 없이 저장됩니다.</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowConfirmModal(false)}
            >
              취소
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={confirmPending}
            >
              {confirmPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  처리중...
                </span>
              ) : (
                <>
                  <Check className="h-4 w-4" /> 확정하기
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 규칙 저장 모달 */}
      <Modal
        open={!!ruleModal}
        onClose={() => setRuleModal(null)}
        title="자동분류 규칙 저장"
      >
        {ruleModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm bg-primary-bg rounded-xl p-3">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
              <span>
                앞으로 <strong>&quot;{ruleModal.merchantName}&quot;</strong>이(가) 포함된 가맹점은 자동으로 이 카테고리로 분류됩니다.
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRuleModal(null)}>
                취소
              </Button>
              <Button className="flex-1" onClick={handleSaveRule}>
                <BookmarkPlus className="h-4 w-4" /> 규칙 저장
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="리뷰 내역 삭제"
      >
        <p className="text-sm text-muted-foreground mb-6">
          <strong className="text-foreground">
            {importData.statement_month.slice(0, 7)} {providerLabel}
          </strong>{' '}
          내역({stats.total}건)을 삭제할까요? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>취소</Button>
          <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deletePending}>
            {deletePending ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function ReviewRowItem({
  row,
  categories,
  isConfirmed,
  onCategoryChange,
  onToggleExclude,
  onSaveRule,
}: {
  row: CardStatementRow
  categories: ExpenseCategory[]
  isConfirmed: boolean
  onCategoryChange: (rowId: string, categoryId: string) => void
  onToggleExclude: (rowId: string, excluded: boolean) => void
  onSaveRule: (merchantName: string, categoryId: string) => void
}) {
  const [showCategorySelect, setShowCategorySelect] = useState(false)

  return (
    <div
      className={`p-4 transition-colors ${
        row.is_excluded ? 'bg-muted/30 opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* 왼쪽: 날짜 + 가맹점 + 카테고리 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">{row.transaction_date}</span>
            {row.is_excluded && (
              <Badge className="bg-muted text-muted-foreground text-[10px]">제외</Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate">{row.merchant_name}</p>

          {/* 카테고리 표시/변경 */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {row.is_matched && row.category_name ? (
              <Badge className="bg-accent-bg text-accent-dark">
                <Tag className="h-3 w-3 mr-1" />
                {row.category_name}
              </Badge>
            ) : !row.is_excluded ? (
              <Badge className="bg-warm-bg text-warm-dark">
                <AlertCircle className="h-3 w-3 mr-1" />
                미분류
              </Badge>
            ) : null}

            {!isConfirmed && !row.is_excluded && (
              <button
                onClick={() => setShowCategorySelect(!showCategorySelect)}
                className="text-xs text-primary hover:text-primary-dark font-medium"
              >
                {row.is_matched ? '변경' : '분류하기'}
              </button>
            )}

            {/* 규칙 저장 제안: 수동 분류된 건에만 */}
            {!isConfirmed && row.is_matched && row.category_id && (
              <button
                onClick={() => onSaveRule(row.merchant_name, row.category_id!)}
                className="text-xs text-secondary hover:text-secondary-dark font-medium flex items-center gap-0.5"
              >
                <BookmarkPlus className="h-3 w-3" /> 규칙저장
              </button>
            )}
          </div>

          {/* 카테고리 선택 드롭다운 */}
          {showCategorySelect && !isConfirmed && (
            <div className="mt-2 bg-surface border-2 border-border rounded-xl p-2 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onCategoryChange(row.id, cat.id)
                      setShowCategorySelect(false)
                    }}
                    className={`text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                      row.category_id === cat.id
                        ? 'bg-primary text-white'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 금액 + 액션 */}
        <div className="flex flex-col items-end gap-2">
          <span className={`text-sm font-bold ${row.is_excluded ? 'line-through text-muted-foreground' : ''}`}>
            {formatKRW(row.amount)}
          </span>

          {!isConfirmed && (
            <button
              onClick={() => onToggleExclude(row.id, !row.is_excluded)}
              className={`p-1.5 rounded-lg transition-colors ${
                row.is_excluded
                  ? 'text-accent-dark hover:bg-accent-bg'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title={row.is_excluded ? '포함하기' : '제외하기'}
            >
              {row.is_excluded ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
