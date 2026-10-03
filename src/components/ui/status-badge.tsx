import { Badge } from './badge'
import type { ProposalStatus, MeasurementStatus, ObraStatus, PurchaseStatus } from '@/lib/types/database'

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const map = {
    rascunho: { label: 'Rascunho', variant: 'neutral' as const },
    enviada: { label: 'Enviada', variant: 'exec' as const },
    aceita: { label: 'Aceita', variant: 'success' as const },
    rejeitada: { label: 'Rejeitada', variant: 'danger' as const },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function MeasurementStatusBadge({ status }: { status: MeasurementStatus }) {
  const map = {
    rascunho: { label: 'Rascunho', variant: 'neutral' as const },
    enviada: { label: 'Enviada', variant: 'exec' as const },
    aprovada: { label: 'Aprovada', variant: 'success' as const },
    contestada: { label: 'Contestada', variant: 'danger' as const },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function ObraStatusBadge({ status }: { status: ObraStatus }) {
  const map = {
    pre_obra: { label: 'Pré-obra', variant: 'neutral' as const },
    ativa: { label: 'Ativa', variant: 'success' as const },
    concluida: { label: 'Concluída', variant: 'exec' as const },
    pausada: { label: 'Pausada', variant: 'warning' as const },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const map = {
    pendente: { label: 'Pendente', variant: 'warning' as const },
    pedido: { label: 'Pedido', variant: 'exec' as const },
    entregue: { label: 'Entregue', variant: 'success' as const },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}
