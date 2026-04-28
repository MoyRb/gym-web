import { PDF_RESOURCE_AUDIT_BY_SLUG } from "../src/lib/pdf/resources-data"
import { RESOURCE_SEEDS } from "../src/lib/pdf/resources-content/base-resources"

const PROHIBITED_PHRASES = [
  "guía dinámica de fitness club",
  "recurso temporal",
  "aunque el recurso no exista aún en el catálogo principal",
  "cómo usar este recurso temporal",
]

const MIN_CONTENT_LENGTH = 380

function flattenContent(resource) {
  const sectionText = resource.sections
    .map((section) => [section.heading, ...(section.body ?? []), ...(section.checklist ?? [])].join(" "))
    .join(" ")

  return `${resource.title} ${resource.description} ${resource.objective} ${sectionText} ${resource.recommendations.join(" ")}`
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

const rows = []
const duplicateBodies = new Map()

for (const seed of RESOURCE_SEEDS) {
  const audit = PDF_RESOURCE_AUDIT_BY_SLUG.get(seed.slug)

  if (!audit) {
    rows.push({ slug: seed.slug, status: "FAIL", issues: ["sin contenido generado"] })
    continue
  }

  const text = flattenContent(audit.content)
  const normalized = normalize(text)
  const bodyFingerprint = normalize(
    audit.content.sections
      .map((section) => [...(section.body ?? []), ...(section.checklist ?? [])].join("|"))
      .join("#"),
  )

  if (!duplicateBodies.has(bodyFingerprint)) duplicateBodies.set(bodyFingerprint, [])
  duplicateBodies.get(bodyFingerprint).push(seed.slug)

  const issues = []

  const prohibitedMatches = PROHIBITED_PHRASES.filter((phrase) => normalized.includes(normalize(phrase)))
  if (prohibitedMatches.length > 0) {
    issues.push(`frases prohibidas: ${prohibitedMatches.join(", ")}`)
  }

  if (audit.content.category !== seed.category) {
    issues.push(`categoria incorrecta: esperado=${seed.category}, actual=${audit.content.category}`)
  }

  if (audit.content.title !== seed.title) {
    issues.push(`titulo incorrecto: esperado='${seed.title}', actual='${audit.content.title}'`)
  }

  if (!normalized.includes(normalize(seed.title))) {
    issues.push("el contenido no incluye el titulo del recurso")
  }

  if (text.length < MIN_CONTENT_LENGTH) {
    issues.push(`contenido corto (${text.length} caracteres)`)
  }

  rows.push({
    slug: seed.slug,
    title: seed.title,
    category: seed.category,
    builder: audit.builder,
    usesFallback: audit.usesFallback,
    status: issues.length ? "FAIL" : "OK",
    issues,
  })
}

for (const row of rows) {
  const audit = PDF_RESOURCE_AUDIT_BY_SLUG.get(row.slug)
  if (!audit) continue

  const bodyFingerprint = normalize(
    audit.content.sections
      .map((section) => [...(section.body ?? []), ...(section.checklist ?? [])].join("|"))
      .join("#"),
  )

  const duplicates = duplicateBodies.get(bodyFingerprint) ?? []
  if (duplicates.length > 1) {
    row.status = "FAIL"
    row.issues.push(`contenido duplicado con: ${duplicates.filter((slug) => slug !== row.slug).join(", ")}`)
  }
}

console.log("=== AUDITORÍA DE RECURSOS PDF ===")
for (const row of rows) {
  const issueLabel = row.issues.length ? ` | issues: ${row.issues.join("; ")}` : ""
  console.log(
    `${row.status.padEnd(4)} | ${row.slug} | cat=${row.category} | builder=${row.builder ?? "-"} | fallback=${String(row.usesFallback)}${issueLabel}`,
  )
}

const failed = rows.filter((row) => row.status !== "OK")
console.log("\nResumen:")
console.log(`Total: ${rows.length}`)
console.log(`OK: ${rows.length - failed.length}`)
console.log(`FAIL: ${failed.length}`)

if (failed.length > 0) {
  process.exitCode = 1
}
