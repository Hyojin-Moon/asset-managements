'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Header } from '@/components/layout/header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { uploadCardStatement, deleteCardImport } from '@/lib/actions/card-upload'
import { Modal } from '@/components/ui/modal'
import { PERSON_TYPES, PERSON_EMOJI } from '@/lib/utils/constants'
import { Upload, FileSpreadsheet, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CardStatementImport, PersonType, CardProvider } from '@/types'

const CARD_OPTIONS = [
  { value: 'samsung', label: '삼성카드' },
  { value: 'kb', label: '국민카드' },
  { value: 'other', label: '기타' },
]

export function CardUploadClient({ history }: { history: CardStatementImport[] }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [cardProvider, setCardProvider] = useState<CardProvider>('samsung')
  const [personType, setPersonType] = useState<PersonType>('공통')
  const [statementMonth, setStatementMonth] = useState(new Date().toISOString().slice(0, 7))
  const [pending, setPending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CardStatementImport | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  })

  async function handleUpload() {
    if (!file) {
      toast.error('파일을 선택해주세요.')
      return
    }

    setPending(true)
    const formData = new FormData()
    formData.set('file', file)
    formData.set('card_provider', cardProvider)
    formData.set('person_type', personType)
    formData.set('statement_month', statementMonth)

    const result = await uploadCardStatement(formData)

    if (result.success && result.importId) {
      toast.success(`${file.name} 파싱 완료!`)
      router.push(`/card-upload/${result.importId}`)
    } else {
      toast.error(result.error || '업로드 실패')
    }
    setPending(false)
  }

  async function handleDeleteImport() {
    if (!deleteTarget) return
    setDeletePending(true)
    const result = await deleteCardImport(deleteTarget.id)
    if (result.success) {
      toast.success('삭제되었습니다')
      setDeleteTarget(null)
    } else {
      toast.error(result.error || '삭제 실패')
    }
    setDeletePending(false)
  }

  const personOptions = PERSON_TYPES.map((p) => ({ value: p, label: `${PERSON_EMOJI[p]} ${p}` }))

  return (
    <div>
      <Header title="카드 명세서 업로드" description="엑셀 파일을 업로드하면 자동으로 거래를 분류합니다" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <Card className="lg:col-span-2">
          <CardContent>
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 mb-5 ${
                isDragActive
                  ? 'border-primary bg-primary-bg'
                  : file
                    ? 'border-accent bg-accent-bg'
                    : 'border-border hover:border-primary-light hover:bg-primary-bg/50'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="h-10 w-10 text-accent-dark" />
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">클릭하여 다른 파일 선택</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium text-sm">파일을 여기에 드래그하거나 클릭하세요</p>
                  <p className="text-xs text-muted-foreground">.xlsx, .xls 파일 지원</p>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <Select
                id="card_provider"
                label="카드사"
                options={CARD_OPTIONS}
                value={cardProvider}
                onChange={(e) => setCardProvider(e.target.value as CardProvider)}
              />
              <Select
                id="person_type"
                label="소유자"
                options={personOptions}
                value={personType}
                onChange={(e) => setPersonType(e.target.value as PersonType)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground/80">대상월</label>
                <input
                  type="month"
                  value={statementMonth}
                  onChange={(e) => setStatementMonth(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-sm hover:border-border-hover focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || pending}
              className="w-full"
              size="lg"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  파싱 중...
                </span>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> 업로드 및 파싱
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Upload History */}
        <Card>
          <CardHeader>
            <CardTitle>업로드 이력</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">아직 업로드 이력이 없어요</p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="group p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => {
                      if (item.status === 'reviewing') router.push(`/card-upload/${item.id}`)
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {item.statement_month.slice(0, 7)} {item.card_provider === 'samsung' ? '삼성' : item.card_provider === 'kb' ? '국민' : '기타'}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{PERSON_EMOJI[item.person_type as PersonType]} {item.person_type}</span>
                        <span>·</span>
                        <span>{item.total_rows}건</span>
                      </div>
                      {item.status === 'reviewing' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(item)
                          }}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="리뷰 내역 삭제"
      >
        {deleteTarget && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              <strong className="text-foreground">
                {deleteTarget.statement_month.slice(0, 7)}{' '}
                {deleteTarget.card_provider === 'samsung' ? '삼성카드' : deleteTarget.card_provider === 'kb' ? '국민카드' : '기타'}
              </strong>{' '}
              내역({deleteTarget.total_rows}건)을 삭제할까요?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>취소</Button>
              <Button variant="destructive" className="flex-1" onClick={handleDeleteImport} disabled={deletePending}>
                {deletePending ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'confirmed') {
    return <Badge className="bg-accent-bg text-accent-dark"><CheckCircle className="h-3 w-3 mr-1" />확정</Badge>
  }
  if (status === 'reviewing') {
    return <Badge className="bg-warm-bg text-warm-dark"><Clock className="h-3 w-3 mr-1" />리뷰중</Badge>
  }
  if (status === 'cancelled') {
    return <Badge className="bg-primary-bg text-primary-dark"><XCircle className="h-3 w-3 mr-1" />취소</Badge>
  }
  return <Badge>{status}</Badge>
}
