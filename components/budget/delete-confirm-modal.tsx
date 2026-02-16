'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { deleteBudgetItem } from '@/lib/actions/budget'
import { toast } from 'sonner'

interface DeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  itemId: string
  itemName: string
}

export function DeleteConfirmModal({ open, onClose, itemId, itemName }: DeleteConfirmModalProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    setPending(true)
    const result = await deleteBudgetItem(itemId)
    if (result.success) {
      toast.success('삭제되었습니다')
      onClose()
      router.refresh()
    } else {
      toast.error(result.error || '삭제 중 오류가 발생했습니다')
    }
    setPending(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="항목 삭제">
      <p className="text-sm text-muted-foreground mb-6">
        <strong className="text-foreground">{itemName}</strong> 항목을 삭제할까요?
      </p>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
          취소
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="flex-1"
          onClick={handleDelete}
          disabled={pending}
        >
          {pending ? '삭제 중...' : '삭제'}
        </Button>
      </div>
    </Modal>
  )
}
