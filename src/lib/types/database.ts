export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type UserRole = 'executor' | 'cliente'
export type TierType = 'free' | 'tier1' | 'tier2' | 'tier3'
export type ObraStatus = 'pre_obra' | 'ativa' | 'concluida' | 'pausada'
export type ProposalStatus = 'rascunho' | 'enviada' | 'aceita' | 'rejeitada'
export type MeasurementStatus = 'rascunho' | 'enviada' | 'aprovada' | 'contestada'
export type PurchaseStatus = 'pendente' | 'pedido' | 'entregue'
export type PurchaseSource = 'contrato' | 'extra'
export type InviteStatus = 'pendente' | 'aceito' | 'expirado'

type Rel = never[]

// Row types (flat, no circular refs)
export type Profile = {
  id: string; name: string; role: UserRole; tier: TierType
  stripe_customer_id: string | null; created_at: string; updated_at: string
}
export type Obra = {
  id: string; executor_id: string; name: string; address: string | null
  description: string | null; status: ObraStatus; created_at: string; updated_at: string
}
export type ObraMember = {
  id: string; obra_id: string; user_id: string | null; invited_email: string
  role: UserRole; invited_at: string; accepted_at: string | null
}
export type Invite = {
  id: string; token: string; obra_id: string; email: string
  status: InviteStatus; created_at: string; expires_at: string
}
export type Proposal = {
  id: string; obra_id: string; file_url: string | null; file_name: string | null
  status: ProposalStatus; total_value: number | null
  sent_at: string | null; accepted_at: string | null; created_at: string; updated_at: string
}
export type ProposalItem = {
  id: string; proposal_id: string; line_number: number; code: string | null
  description: string; unit: string; qty: number; unit_price: number; total: number
  sinapi_id: string | null; created_at: string
}
export type CatalogItem = {
  id: string; obra_id: string; description: string; unit: string
  qty_total: number; qty_done: number; unit_price: number
  order_index: number; created_at: string; updated_at: string
}
export type TeamMember = {
  id: string; executor_id: string; name: string; role: string | null
  phone: string | null; active: boolean; created_at: string
}
export type ObraAssignment = {
  id: string; obra_id: string; team_member_id: string
  assigned_at: string; unassigned_at: string | null
}
export type DiaryEntry = {
  id: string; obra_id: string; date: string; no_work: boolean
  no_work_reason: string | null; notes: string | null; closed: boolean
  closed_at: string | null; created_at: string; updated_at: string
}
export type DiaryWorker = {
  id: string; diary_entry_id: string; team_member_id: string; came: boolean
}
export type DiaryItemProgress = {
  id: string; diary_entry_id: string; catalog_item_id: string; qty_done: number
}
export type Measurement = {
  id: string; obra_id: string; period_start: string; period_end: string
  status: MeasurementStatus; total: number; contest_reason: string | null
  sent_at: string | null; approved_at: string | null; contested_at: string | null
  created_at: string; updated_at: string
}
export type MeasurementItem = {
  id: string; measurement_id: string; catalog_item_id: string | null
  description: string; unit: string; qty: number; unit_price: number; total: number
}
export type Purchase = {
  id: string; obra_id: string; description: string; qty: number; unit: string
  sinapi_id: string | null; estimated_price: number | null
  status: PurchaseStatus; source: PurchaseSource; notes: string | null
  created_at: string; updated_at: string
}
export type SinapiInsumo = {
  id: string; codigo: string; descricao: string; unidade: string | null
  preco_ref: number | null; estado: string; mes_ref: string; search_vector: string | null
}
export type Blocker = {
  id: string; obra_id: string; description: string; status: string
  created_by: string | null; resolved_at: string | null; created_at: string; updated_at: string
}

export interface Database {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      tier_type: TierType
      obra_status: ObraStatus
      proposal_status: ProposalStatus
      measurement_status: MeasurementStatus
      purchase_status: PurchaseStatus
      purchase_source: PurchaseSource
      invite_status: InviteStatus
    }
    CompositeTypes: Record<string, never>
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Omit<Profile, 'id'>>; Relationships: Rel }
      obras: { Row: Obra; Insert: Omit<Obra, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: ObraStatus }; Update: Partial<Omit<Obra, 'id'>>; Relationships: Rel }
      obra_members: { Row: ObraMember; Insert: Omit<ObraMember, 'id' | 'invited_at' | 'user_id' | 'accepted_at'> & { user_id?: string | null; accepted_at?: string | null }; Update: Partial<Omit<ObraMember, 'id'>>; Relationships: Rel }
      invites: { Row: Invite; Insert: Omit<Invite, 'id' | 'token' | 'created_at' | 'expires_at' | 'status'> & { status?: InviteStatus }; Update: Partial<Omit<Invite, 'id'>>; Relationships: Rel }
      proposals: { Row: Proposal; Insert: Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'status' | 'accepted_at' | 'sent_at'> & { status?: ProposalStatus; accepted_at?: string | null; sent_at?: string | null }; Update: Partial<Omit<Proposal, 'id'>>; Relationships: Rel }
      proposal_items: { Row: ProposalItem; Insert: Omit<ProposalItem, 'id' | 'total' | 'created_at' | 'sinapi_id' | 'code'> & { sinapi_id?: string | null; code?: string | null }; Update: Partial<Omit<ProposalItem, 'id' | 'total'>>; Relationships: Rel }
      catalog_items: { Row: CatalogItem; Insert: Omit<CatalogItem, 'id' | 'created_at' | 'updated_at' | 'qty_done'> & { qty_done?: number }; Update: Partial<Omit<CatalogItem, 'id'>>; Relationships: Rel }
      team_members: { Row: TeamMember; Insert: Omit<TeamMember, 'id' | 'created_at' | 'active' | 'phone'> & { active?: boolean; phone?: string | null }; Update: Partial<Omit<TeamMember, 'id'>>; Relationships: Rel }
      obra_assignments: { Row: ObraAssignment; Insert: Omit<ObraAssignment, 'id' | 'assigned_at' | 'unassigned_at'> & { unassigned_at?: string | null }; Update: Partial<Omit<ObraAssignment, 'id'>>; Relationships: Rel }
      diary_entries: { Row: DiaryEntry; Insert: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<DiaryEntry, 'id'>>; Relationships: Rel }
      diary_workers: { Row: DiaryWorker; Insert: Omit<DiaryWorker, 'id'>; Update: Partial<Omit<DiaryWorker, 'id'>>; Relationships: Rel }
      diary_item_progress: { Row: DiaryItemProgress; Insert: Omit<DiaryItemProgress, 'id'>; Update: Partial<Omit<DiaryItemProgress, 'id'>>; Relationships: Rel }
      measurements: { Row: Measurement; Insert: Omit<Measurement, 'id' | 'created_at' | 'updated_at' | 'status' | 'sent_at' | 'contest_reason' | 'approved_at' | 'contested_at'> & { status?: MeasurementStatus; sent_at?: string | null; contest_reason?: string | null; approved_at?: string | null; contested_at?: string | null }; Update: Partial<Omit<Measurement, 'id'>>; Relationships: Rel }
      measurement_items: { Row: MeasurementItem; Insert: Omit<MeasurementItem, 'id' | 'total'>; Update: Partial<Omit<MeasurementItem, 'id' | 'total'>>; Relationships: Rel }
      purchases: { Row: Purchase; Insert: Omit<Purchase, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: PurchaseStatus }; Update: Partial<Omit<Purchase, 'id'>>; Relationships: Rel }
      sinapi_insumos: { Row: SinapiInsumo; Insert: Omit<SinapiInsumo, 'id' | 'search_vector'>; Update: Partial<Omit<SinapiInsumo, 'id' | 'search_vector'>>; Relationships: Rel }
      blockers: { Row: Blocker; Insert: Omit<Blocker, 'id' | 'created_at' | 'updated_at' | 'resolved_at'> & { resolved_at?: string | null }; Update: Partial<Omit<Blocker, 'id'>>; Relationships: Rel }
    }
  }
}
