import { getMonthlyReport } from '@/lib/actions/reports'
import { MonthlyReportClient } from './monthly-report-client'

export default async function MonthlyReportPage() {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const report = await getMonthlyReport(currentMonth)

  return <MonthlyReportClient initialData={report} />
}
