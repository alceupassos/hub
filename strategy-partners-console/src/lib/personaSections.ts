// Isomorphic — no `fs`, no `server-only`. Every PERSONA*.md file uses the same
// "## NÃO responde / Guard Rails" heading as the boundary between the public,
// user-editable description and the fixed guard-rail/identity sections that must
// never be shown or editable in the UI.
export function splitPersonaText(raw: string): { editable: string; fixed: string } {
  const idx = raw.search(/\n##\s*NÃO responde/)
  if (idx === -1) return { editable: raw.trim(), fixed: '' }
  return { editable: raw.slice(0, idx).trim(), fixed: raw.slice(idx + 1).trim() }
}
