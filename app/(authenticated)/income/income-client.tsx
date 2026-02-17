'use client'

import { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { BudgetFormModal } from '@/components/budget/budget-form-modal'
import { DeleteConfirmModal } from '@/components/budget/delete-confirm-modal'
import { SortableTableRow, SortableMobileCard } from '@/components/budget/sortable-budget-row'
import { formatKRW } from '@/lib/utils/format'
import { PERSON_EMOJI } from '@/lib/utils/constants'
import { updateBudgetItemOrder } from '@/lib/actions/budget'
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import type { BudgetItem, PersonType } from '@/types'

const TABS: (PersonType | '전체')[] = ['전체', '공통', '효진', '호영']

export function IncomeClient({ items: initialItems }: { items: BudgetItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [activeTab, setActiveTab] = useState<PersonType | '전체'>('전체')
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<BudgetItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)

  // items가 서버에서 새로 넘어오면 동기화
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const filtered = activeTab === '전체'
    ? items
    : items.filter((i) => i.person_type === activeTab)

  const total = filtered.reduce((sum, i) => sum + i.amount, 0)

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = filtered.findIndex((i) => i.id === active.id)
    const newIndex = filtered.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(filtered, oldIndex, newIndex)

    // 낙관적 업데이트: 전체 items 배열에서도 순서 반영
    const orderMap = new Map(reordered.map((item, idx) => [item.id, idx]))
    setItems((prev) =>
      prev.map((item) => orderMap.has(item.id) ? { ...item, sort_order: orderMap.get(item.id)! } : item)
        .sort((a, b) => a.sort_order - b.sort_order)
    )

    const updates = reordered.map((item, idx) => ({ id: item.id, sort_order: idx }))
    const result = await updateBudgetItemOrder(updates)
    if (!result.success) {
      toast.error('순서 저장에 실패했습니다')
      setItems(initialItems)
    }
  }

  return (
    <div>
      <Header
        title="수입 관리"
        description="고정 수입 항목을 관리합니다"
        action={
          <Button onClick={() => { setEditItem(null); setFormOpen(true) }}>
            <Plus className="h-4 w-4" /> 추가
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border-2 ${
              activeTab === tab
                ? 'bg-primary-bg border-primary-light text-primary-dark'
                : 'bg-surface border-border text-muted-foreground hover:border-border-hover'
            }`}
          >
            {tab !== '전체' && PERSON_EMOJI[tab]} {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TrendingUp className="h-12 w-12" />}
            title="수입 항목이 없어요"
            description="첫 수입 항목을 등록해보세요"
            action={
              <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> 추가하기
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <DndContext
              id="income-dnd-desktop"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={filtered.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border text-muted-foreground">
                      <th className="w-8" />
                      <th className="text-left py-3 px-3 font-medium">인물</th>
                      <th className="text-left py-3 px-3 font-medium">항목명</th>
                      <th className="text-right py-3 px-3 font-medium">금액</th>
                      <th className="text-left py-3 px-3 font-medium">시작월</th>
                      <th className="text-left py-3 px-3 font-medium">종료월</th>
                      <th className="text-right py-3 px-3 font-medium">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <SortableTableRow key={item.id} id={item.id}>
                        <td className="py-3 px-3">
                          <Badge variant="person">
                            {PERSON_EMOJI[item.person_type]} {item.person_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-medium">{item.name}</td>
                        <td className="py-3 px-3 text-right font-semibold text-accent-dark">
                          {formatKRW(item.amount)}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{item.effective_from.slice(0, 7)}</td>
                        <td className="py-3 px-3 text-muted-foreground">{item.effective_until?.slice(0, 7) || '-'}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => { setEditItem(item); setFormOpen(true) }}
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteItem({ id: item.id, name: item.name })}
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-error/10 hover:text-error transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </SortableTableRow>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td />
                      <td colSpan={2} className="py-3 px-3 font-semibold">합계</td>
                      <td className="py-3 px-3 text-right font-bold text-accent-dark">{formatKRW(total)}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </SortableContext>
            </DndContext>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            <DndContext
              id="income-dnd-mobile"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={filtered.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {filtered.map((item) => (
                  <SortableMobileCard key={item.id} id={item.id} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="person" className="text-[10px]">
                          {PERSON_EMOJI[item.person_type]} {item.person_type}
                        </Badge>
                        <span className="font-medium text-sm truncate">{item.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.effective_from.slice(0, 7)} ~ {item.effective_until?.slice(0, 7) || '무기한'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-sm text-accent-dark">{formatKRW(item.amount)}</span>
                      <button
                        onClick={() => { setEditItem(item); setFormOpen(true) }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </SortableMobileCard>
                ))}
              </SortableContext>
            </DndContext>
            <div className="flex justify-between items-center pt-3 border-t-2 border-border px-3">
              <span className="font-semibold text-sm">합계</span>
              <span className="font-bold text-accent-dark">{formatKRW(total)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Modals */}
      <BudgetFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null) }}
        type="income"
        editItem={editItem}
      />

      {deleteItem && (
        <DeleteConfirmModal
          open={!!deleteItem}
          onClose={() => setDeleteItem(null)}
          itemId={deleteItem.id}
          itemName={deleteItem.name}
        />
      )}
    </div>
  )
}
