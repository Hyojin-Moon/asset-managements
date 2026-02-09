import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function SavingsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Total */}
      <Card className="p-5">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-8 w-40" />
      </Card>

      {/* Savings cards */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-5">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-14 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-full rounded-full mb-2" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="mt-4 space-y-2">
            {[1, 2].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24 ml-auto" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  )
}
