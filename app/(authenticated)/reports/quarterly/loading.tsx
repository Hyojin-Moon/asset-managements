import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function QuarterlyReportLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>

      <Card className="p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Card>

      <Card className="p-5">
        <Skeleton className="h-5 w-28 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <Skeleton className="h-5 w-36 mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </Card>
    </div>
  )
}
