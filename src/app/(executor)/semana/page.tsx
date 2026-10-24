import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { formatDate } from '@/lib/utils'

function getWeekDays(): string[] {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export default async function SemanaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const days = getWeekDays()
  const weekStart = days[0]
  const weekEnd = days[6]

  const { data: obras } = await supabase
    .from('obras')
    .select('id, name, status')
    .eq('executor_id', user.id)
    .in('status', ['ativa', 'pre_obra'])
    .order('name')

  const { data: entries } = await supabase
    .from('diary_entries')
    .select('obra_id, date, no_work, closed')
    .in('obra_id', (obras || []).map(o => o.id))
    .gte('date', weekStart)
    .lte('date', weekEnd)

  const entriesByObra: Record<string, Record<string, { no_work: boolean; closed: boolean }>> = {}
  for (const e of entries || []) {
    if (!entriesByObra[e.obra_id]) entriesByObra[e.obra_id] = {}
    entriesByObra[e.obra_id][e.date] = { no_work: e.no_work, closed: e.closed }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-dvh bg-ground pb-24">
      <PageHeader title="Semana" variant="exec" />

      <div className="px-[18px] pt-4">
        {/* Day header row */}
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {days.map(d => {
            const date = new Date(d + 'T12:00:00')
            const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).toUpperCase().replace('.', '')
            const dayNum = date.getDate()
            const isToday = d === today
            return (
              <div key={d} className={`flex-1 min-w-[36px] text-center py-2 rounded-[8px] ${isToday ? 'bg-exec text-white' : 'bg-chrome border border-chrome-line'}`}>
                <p className={`text-[10px] font-mono font-semibold ${isToday ? 'text-white/80' : 'text-ink-3'}`}>{weekday}</p>
                <p className={`text-[14px] font-bold font-mono ${isToday ? 'text-white' : 'text-ink'}`}>{dayNum}</p>
              </div>
            )
          })}
        </div>

        {/* Obra rows */}
        <div className="flex flex-col gap-3">
          {(obras || []).map(obra => (
            <div key={obra.id} className="bg-chrome border border-chrome-line rounded-[10px] overflow-hidden">
              <div className="px-[14px] py-2.5 border-b border-chrome-line">
                <p className="font-semibold text-[13.5px] text-ink">{obra.name}</p>
              </div>
              <div className="flex gap-1 p-2">
                {days.map(d => {
                  const entry = entriesByObra[obra.id]?.[d]
                  const isFuture = d > today
                  let bg = 'bg-frame'
                  if (entry?.closed) {
                    bg = entry.no_work ? 'bg-ink-3' : 'bg-exec'
                  } else if (d === today && !isFuture) {
                    bg = 'bg-signal'
                  }
                  return (
                    <div key={d} className={`flex-1 h-[28px] rounded-[6px] ${bg}`} />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {(!obras || obras.length === 0) && (
          <div className="bg-chrome border border-chrome-line rounded-[10px] p-[14px] text-center">
            <p className="text-[13.5px] text-ink-2">Nenhuma obra ativa.</p>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 mt-4">
          {[
            { color: 'bg-exec', label: 'Fechado' },
            { color: 'bg-ink-3', label: 'Sem atividade' },
            { color: 'bg-signal', label: 'Hoje' },
            { color: 'bg-frame border border-chrome-line', label: 'Sem registro' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-[3px] ${l.color}`} />
              <span className="text-[11px] text-ink-3">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
