"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

type CommissionStatus = "pending" | "approved" | "paid" | "void"

const ALLOWED_TRANSITIONS: Record<CommissionStatus, CommissionStatus[]> = {
  pending: ["approved", "void"],
  approved: ["paid", "void"],
  paid: [],
  void: [],
}

const LABELS: Record<CommissionStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobar",
  paid: "Marcar pagada",
  void: "Anular",
}

interface Props {
  commissionId: string
  currentStatus: CommissionStatus
}

export function CommissionStatusActions({ commissionId, currentStatus }: Props) {
  const [loading, setLoading] = useState<CommissionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const transitions = ALLOWED_TRANSITIONS[currentStatus] ?? []

  if (transitions.length === 0) return null

  async function handleTransition(newStatus: CommissionStatus) {
    setLoading(newStatus)
    setError(null)

    try {
      const res = await fetch(`/api/admin/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        setError(data.error ?? "Error.")
        return
      }

      window.location.reload()
    } catch {
      setError("Error de conexión.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        {transitions.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={t === "void" ? "ghost" : "outline"}
            disabled={!!loading}
            onClick={() => handleTransition(t)}
            className={`text-xs h-7 px-2 ${t === "void" ? "text-muted-foreground hover:text-destructive" : ""}`}
          >
            {loading === t ? "..." : LABELS[t]}
          </Button>
        ))}
      </div>
      {error && <p className="text-[10px] text-destructive text-right">{error}</p>}
    </div>
  )
}
