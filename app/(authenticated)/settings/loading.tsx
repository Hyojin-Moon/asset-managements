import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-20" />

      {/* Categories section */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-14 rounded-lg ml-auto" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>

      {/* Rules section */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
            </div>
          ))}
        </div>
      </Card>

      {/* Data management */}
      <Card className="p-5">
        <Skeleton className="h-5 w-28 mb-4" />
        <Skeleton className="h-10 w-48 rounded-xl" />
      </Card>
    </div>
  )
}
