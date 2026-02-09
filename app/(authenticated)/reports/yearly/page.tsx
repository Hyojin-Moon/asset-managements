import { getYearlyReport } from '@/lib/actions/reports'
import { YearlyReportClient } from './yearly-report-client'

export default async function YearlyReportPage() {
  const year = new Date().getFullYear()
  const report = await getYearlyReport(year)

  return <YearlyReportClient initialData={report} />
}
