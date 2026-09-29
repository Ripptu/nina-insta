// Erneuert das Instagram-Token (verschlüsselt in data/ig-token.enc). Wöchentlich per Workflow.
import { erneuereToken } from './instagram.mjs'
const r = await erneuereToken()
console.log('Token erneuert, läuft ab in Tagen:', r.tage ?? r.expires_in_tage ?? '?')
