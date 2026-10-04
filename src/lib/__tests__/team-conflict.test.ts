import { describe, it, expect } from 'vitest'

// Pure conflict detection logic (mirrors equipe-client.tsx)
function hasConflict(
  memberId: string,
  obraId: string,
  allActiveAssignments: { team_member_id: string; obra_id: string }[]
): boolean {
  return allActiveAssignments.filter(
    a => a.team_member_id === memberId && a.obra_id !== obraId
  ).length > 0
}

describe('hasConflict', () => {
  const obraA = 'obra-a'
  const obraB = 'obra-b'
  const obraC = 'obra-c'
  const member1 = 'member-1'
  const member2 = 'member-2'

  it('no conflict — member only assigned to current obra', () => {
    const assignments = [{ team_member_id: member1, obra_id: obraA }]
    expect(hasConflict(member1, obraA, assignments)).toBe(false)
  })

  it('conflict — member assigned to another obra', () => {
    const assignments = [
      { team_member_id: member1, obra_id: obraA },
      { team_member_id: member1, obra_id: obraB },
    ]
    expect(hasConflict(member1, obraA, assignments)).toBe(true)
  })

  it('no conflict — different member assigned to other obra', () => {
    const assignments = [
      { team_member_id: member1, obra_id: obraA },
      { team_member_id: member2, obra_id: obraB },
    ]
    expect(hasConflict(member1, obraA, assignments)).toBe(false)
  })

  it('conflict — member assigned to two other obras', () => {
    const assignments = [
      { team_member_id: member1, obra_id: obraB },
      { team_member_id: member1, obra_id: obraC },
    ]
    expect(hasConflict(member1, obraA, assignments)).toBe(true)
  })

  it('no conflict — empty assignments list', () => {
    expect(hasConflict(member1, obraA, [])).toBe(false)
  })

  it('no conflict — member not in any assignment', () => {
    const assignments = [{ team_member_id: member2, obra_id: obraB }]
    expect(hasConflict(member1, obraA, assignments)).toBe(false)
  })
})
