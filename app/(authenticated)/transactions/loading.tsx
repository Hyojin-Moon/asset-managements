import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function TransactionsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      {/* Transaction groups */}
      {[1, 2, 3].map((group) => (
        <div key={group} className="space-y-2">
          <Skeleton className="h-4 w-32 mb-3" />
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}
