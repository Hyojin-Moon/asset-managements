import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-12 w-12 rounded-xl mb-4" />
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>
    </div>
  )
}
