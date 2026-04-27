import React from "react"
import { Document, Page, StyleSheet, Text, View, type DocumentProps } from "@react-pdf/renderer"
import type { PdfResourceContent } from "./types"

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 38,
    paddingHorizontal: 34,
    fontSize: 11,
    color: "#1F2937",
    lineHeight: 1.45,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 10,
  },
  brand: {
    fontSize: 10,
    color: "#E11392",
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: 700,
    marginBottom: 6,
    color: "#0F172A",
  },
  description: {
    fontSize: 11,
    color: "#374151",
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 9,
    color: "#334155",
  },
  section: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0F172A",
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 4,
  },
  listItem: {
    marginBottom: 3,
    marginLeft: 8,
  },
  footer: {
    position: "absolute",
    fontSize: 9,
    bottom: 16,
    left: 34,
    right: 34,
    color: "#64748B",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 6,
  },
})

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    rutinas: "Rutinas",
    calentamiento: "Calentamiento",
    movilidad: "Movilidad",
    cardio: "Cardio",
    nutricion_basica: "Nutrición básica",
    recuperacion: "Recuperación",
    principiantes: "Principiantes",
  }
  return labels[category] ?? category
}

export function FitnessClubPdfDocument({ resource }: { resource: PdfResourceContent }) {
  return (
    <Document title={resource.title} author="FITNESS CLUB" subject={resource.description}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>FITNESS CLUB · RESOURCE PDF</Text>
          <Text style={styles.title}>{resource.title}</Text>
          <Text style={styles.description}>{resource.description}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.badge}>{categoryLabel(resource.category)}</Text>
            <Text style={styles.badge}>Objetivo: {resource.objective}</Text>
          </View>
        </View>

        {resource.sections.map((section) => (
          <View key={section.heading} style={styles.section} wrap={false}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            {section.body.map((line) => (
              <Text key={line} style={styles.paragraph}>{line}</Text>
            ))}
            {section.checklist?.map((item) => (
              <Text key={item} style={styles.listItem}>• {item}</Text>
            ))}
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Recomendaciones finales</Text>
          {resource.recommendations.map((item) => (
            <Text key={item} style={styles.listItem}>• {item}</Text>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `FITNESS CLUB · Documento generado dinámicamente · Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}

export function createFitnessClubPdfDocument(resource: PdfResourceContent): React.ReactElement<DocumentProps> {
  return <FitnessClubPdfDocument resource={resource} />
}
