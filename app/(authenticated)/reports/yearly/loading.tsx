import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function YearlyReportLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-7 w-24" />
          </Card>
        ))}
      </div>

      {/* Main chart */}
      <Card className="p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </Card>
        <Card className="p-5">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </Card>
      </div>
    </div>
  )
}
