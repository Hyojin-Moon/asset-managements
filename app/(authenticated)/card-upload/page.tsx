import { getCardImportHistory } from '@/lib/actions/card-upload'
import { CardUploadClient } from './card-upload-client'

export default async function CardUploadPage() {
  const history = await getCardImportHistory()
  return <CardUploadClient history={history} />
}
