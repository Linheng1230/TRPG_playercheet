/* Save compatibility helpers.
 * Pure migrations only; no state mutation belongs in this file.
 * Loaded before the main application so deserialize/metaFields share one normalizer.
 */
const normalizeAlignment=v=>({"混亂善良":"混沌善良","混亂中立":"混沌中立","混亂邪惡":"混沌邪惡"}[String(v||"").trim()]||String(v||"").trim());
