import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function CardUploadLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />

      {/* Upload area */}
      <Card className="p-8">
        <Skeleton className="h-40 w-full rounded-xl mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl mt-4" />
      </Card>

      {/* History */}
      <Card className="p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-16 rounded-lg ml-auto" />
          </div>
        ))}
      </Card>
    </div>
  )
}
