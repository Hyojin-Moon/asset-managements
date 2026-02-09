import { getQuarterlyReport } from '@/lib/actions/reports'
import { getQuarter } from '@/lib/utils/date'
import { QuarterlyReportClient } from './quarterly-report-client'

export default async function QuarterlyReportPage() {
  const now = new Date()
  const year = now.getFullYear()
  const quarter = getQuarter(now)

  const report = await getQuarterlyReport(year, quarter)

  return <QuarterlyReportClient initialData={report} />
}
