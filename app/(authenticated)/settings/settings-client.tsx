'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Settings, Tag, Wand2, Download, User, LogOut,
  Plus, Pencil, Trash2, Loader2
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { PERSON_TYPES, PERSON_BG_CLASSES } from '@/lib/utils/constants'
import { createCategory, updateCategory, deleteCategory } from '@/lib/actions/categories'
import {
  createMappingRule, deleteMappingRule,
  exportTransactionsCSV, exportBudgetCSV, exportEventsCSV,
} from '@/lib/actions/settings'
import { logout } from '@/lib/actions/auth'
import type { ExpenseCategory, CategoryMappingRule, Profile, PersonType } from '@/types'

interface Props {
  categories: ExpenseCategory[]
  mappingRules: CategoryMappingRule[]
  profile: Profile | null
}

export function SettingsClient({ categories, mappingRules, profile }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-secondary" />
        <h1 className="text-xl font-bold text-foreground">설정</h1>
      </div>

      <CategorySection categories={categories} />
      <MappingRulesSection rules={mappingRules} categories={categories} />
      <DataExportSection />
      <AccountSection profile={profile} />
    </div>
  )
}

// ===== Category Management =====
function CategorySection({ categories }: { categories: ExpenseCategory[] }) {
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEdit(cat: ExpenseCategory) {
    setEditingCategory(cat)
    setShowModal(true)
  }

  function handleDelete(cat: ExpenseCategory) {
    if (!confirm(`'${cat.name}' 카테고리를 삭제하시겠습니까?`)) return
    startTransition(async () => {
      const result = await deleteCategory(cat.id)
      if (result.success) {
        toast.success('카테고리가 삭제되었습니다.')
      } else {
        toast.error(result.error || '삭제 실패')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          카테고리 관리
        </CardTitle>
        <Button
          size="sm"
          onClick={() => { setEditingCategory(null); setShowModal(true) }}
        >
          <Plus className="h-4 w-4" />
          추가
        </Button>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <EmptyState
            icon={<Tag className="h-10 w-10" />}
            title="카테고리가 없습니다"
            description="지출 카테고리를 추가해보세요."
            action={
              <Button size="sm" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" /> 카테고리 추가
              </Button>
            }
          />
        ) : (
          <div className="space-y-1">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors group"
              >
                <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}</span>
                <span className="flex-1 text-sm font-medium">{cat.name}</span>
                <Badge className={PERSON_BG_CLASSES[cat.person_type as PersonType] || ''}>
                  {cat.person_type}
                </Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={isPending}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-error/10 hover:text-error transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CategoryModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editingCategory={editingCategory}
      />
    </Card>
  )
}

function CategoryModal({
  open,
  onClose,
  editingCategory,
}: {
  open: boolean
  onClose: () => void
  editingCategory: ExpenseCategory | null
}) {
  const [name, setName] = useState('')
  const [personType, setPersonType] = useState<PersonType>('공통')
  const [isPending, startTransition] = useTransition()

  // Reset form when modal opens
  const isEdit = !!editingCategory
  if (open && isEdit && name === '' && personType === '공통') {
    setName(editingCategory!.name)
    setPersonType(editingCategory!.person_type as PersonType)
  }

  function handleClose() {
    setName('')
    setPersonType('공통')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      let result
      if (isEdit) {
        result = await updateCategory(editingCategory!.id, { name: name.trim(), person_type: personType })
      } else {
        result = await createCategory({ name: name.trim(), person_type: personType })
      }

      if (result.success) {
        toast.success(isEdit ? '카테고리가 수정되었습니다.' : '카테고리가 추가되었습니다.')
        handleClose()
      } else {
        toast.error(result.error || '처리 실패')
      }
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? '카테고리 수정' : '카테고리 추가'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="카테고리명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 식비, 교통비"
          required
        />
        <Select
          label="인물"
          value={personType}
          onChange={(e) => setPersonType(e.target.value as PersonType)}
          options={PERSON_TYPES.map((p) => ({ value: p, label: p }))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>취소</Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? '수정' : '추가'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ===== Mapping Rules =====
function MappingRulesSection({
  rules,
  categories,
}: {
  rules: CategoryMappingRule[]
  categories: ExpenseCategory[]
}) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete(rule: CategoryMappingRule) {
    if (!confirm(`'${rule.keyword}' 규칙을 삭제하시겠습니까?`)) return
    startTransition(async () => {
      const result = await deleteMappingRule(rule.id)
      if (result.success) {
        toast.success('규칙이 삭제되었습니다.')
      } else {
        toast.error(result.error || '삭제 실패')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-accent" />
          자동분류 규칙
        </CardTitle>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          추가
        </Button>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <EmptyState
            icon={<Wand2 className="h-10 w-10" />}
            title="자동분류 규칙이 없습니다"
            description="카드 명세서 업로드 시 가맹점명을 자동으로 카테고리에 매핑합니다."
            action={
              <Button size="sm" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" /> 규칙 추가
              </Button>
            }
          />
        ) : (
          <div className="space-y-1">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors group"
              >
                <code className="text-sm bg-muted px-2 py-0.5 rounded-lg">{rule.keyword}</code>
                <span className="text-muted-foreground text-sm">→</span>
                <Badge className="bg-accent-bg text-accent-dark">{rule.category_name || '미지정'}</Badge>
                <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(rule)}
                    disabled={isPending}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-error/10 hover:text-error transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <MappingRuleModal
        open={showModal}
        onClose={() => setShowModal(false)}
        categories={categories}
      />
    </Card>
  )
}

function MappingRuleModal({
  open,
  onClose,
  categories,
}: {
  open: boolean
  onClose: () => void
  categories: ExpenseCategory[]
}) {
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setKeyword('')
    setCategoryId('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim() || !categoryId) return

    startTransition(async () => {
      const result = await createMappingRule({
        keyword: keyword.trim(),
        category_id: categoryId,
      })

      if (result.success) {
        toast.success('규칙이 추가되었습니다.')
        handleClose()
      } else {
        toast.error(result.error || '처리 실패')
      }
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title="자동분류 규칙 추가">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="키워드"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="예: 배달의민족, 스타벅스"
          required
        />
        <Select
          label="카테고리"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          placeholder="카테고리 선택"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>취소</Button>
          <Button type="submit" disabled={isPending || !categoryId}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            추가
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ===== Data Export =====
function DataExportSection() {
  const [isPending, startTransition] = useTransition()

  function downloadCSV(filename: string, csv: string) {
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExport(type: 'transactions' | 'budget' | 'events') {
    startTransition(async () => {
      let result
      let filename: string
      switch (type) {
        case 'transactions':
          result = await exportTransactionsCSV()
          filename = `거래내역_${new Date().toISOString().slice(0, 10)}.csv`
          break
        case 'budget':
          result = await exportBudgetCSV()
          filename = `예산항목_${new Date().toISOString().slice(0, 10)}.csv`
          break
        case 'events':
          result = await exportEventsCSV()
          filename = `이벤트_${new Date().toISOString().slice(0, 10)}.csv`
          break
      }

      if (result.success && result.csv) {
        downloadCSV(filename, result.csv)
        toast.success('CSV 파일이 다운로드되었습니다.')
      } else {
        toast.error(result.error || '내보내기 실패')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-4 w-4 text-warm" />
          데이터 관리
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          데이터를 CSV 파일로 내보내기합니다. Excel이나 Google Sheets에서 열 수 있습니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('transactions')}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            거래내역 내보내기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('budget')}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            예산항목 내보내기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('events')}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            이벤트 내보내기
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ===== Account Section =====
function AccountSection({ profile }: { profile: Profile | null }) {
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logout()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4 text-info" />
          계정
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">이름</span>
            <span className="text-sm font-medium">{profile?.display_name || '-'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">역할</span>
            <Badge className={PERSON_BG_CLASSES[profile?.person_type as PersonType] || ''}>
              {profile?.person_type || '-'}
            </Badge>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isPending}
              className="text-error hover:bg-error/10 hover:border-error"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              로그아웃
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
