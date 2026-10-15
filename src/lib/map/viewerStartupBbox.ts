import { isValidBbox } from '@/lib/demo/demoConfig'
import { parseDocumentBbox } from '@/lib/fiche/ficheInfoQuery'
import { locationHashLooksLikeMapPermalink } from '@/lib/map/mapPermalink'
import type { StandardViewerParams } from '@/lib/types'

export function resolveStandardViewerStartupBbox(
  params: StandardViewerParams | undefined,
  options?: { respectPermalink?: boolean; respectInitialSearch?: boolean },
): [number, number, number, number] | null {
  if (options?.respectInitialSearch !== false && params?.search?.fullText?.trim()) {
    return null
  }
  if (options?.respectPermalink !== false && locationHashLooksLikeMapPermalink()) {
    return null
  }
  if (isValidBbox(params?.bbox)) {
    return params.bbox
  }
  const doc = params?.document
  if (doc) {
    return parseDocumentBbox(doc)
  }
  return null
}
