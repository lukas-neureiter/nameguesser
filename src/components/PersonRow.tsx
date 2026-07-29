import type { Employee, LearningStatus } from '../types'
import { Avatar } from './Avatar'
import { StatusBadge } from './StatusBadge'

type PersonRowProps = {
  employee: Employee
  status: LearningStatus
  accuracy: number
  totalAnswers: number
  showStatus?: boolean
  detail?: string
}

export function PersonRow({
  employee,
  status,
  accuracy,
  totalAnswers,
  showStatus = true,
  detail,
}: PersonRowProps) {
  return (
    <div className="person-row flex cursor-default items-center gap-3 py-3">
      <Avatar
        className="h-14 w-14 ring-2 ring-white"
        label={`Porträt von ${employee.firstName} ${employee.lastName}`}
        spriteIndex={employee.spriteIndex}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-extrabold text-[#102142]">
          {employee.firstName} {employee.lastName}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {detail ??
          (totalAnswers === 0
            ? 'Noch nicht abgefragt'
            : `${accuracy} % richtig · ${totalAnswers} ${totalAnswers === 1 ? 'Frage' : 'Fragen'}`)}
        </p>
      </div>
      {showStatus ? <StatusBadge compact status={status} /> : null}
    </div>
  )
}
