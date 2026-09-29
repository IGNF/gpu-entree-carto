/**
 * Normalise le fragment permalink avant Vue Router (decodeURIComponent sur `%` non encodés).
 * Chargé depuis index.html avant main.ts.
 */
import {
  bootstrapMapPermalinkFromLocation,
  locationHashLooksLikeMapPermalink,
} from '@/lib/map/mapPermalink'

if (typeof window !== 'undefined' && locationHashLooksLikeMapPermalink()) {
  bootstrapMapPermalinkFromLocation()
}
