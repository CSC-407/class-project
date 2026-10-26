import { Check, X } from 'lucide-react'
import { PERMISSIONS } from '../lib/data'
import { Table, Th, Td } from './ui'

export function PermissionsMatrix() {
  const Cell = ({ ok }) =>
    ok ? (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        <Check className="size-4" aria-hidden />
        <span className="sr-only">Allowed</span>
      </span>
    ) : (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-subtle text-muted">
        <X className="size-4" aria-hidden />
        <span className="sr-only">Not allowed</span>
      </span>
    )
  return (
    <Table>
      <thead>
        <tr>
          <Th>Permission</Th>
          <Th className="text-center">Student</Th>
          <Th className="text-center">Admin</Th>
          <Th className="text-center">Super Admin</Th>
        </tr>
      </thead>
      <tbody>
        {PERMISSIONS.map((p) => (
          <tr key={p.key} className="hover:bg-subtle/60">
            <Td className="font-medium">{p.key}</Td>
            <Td className="text-center"><Cell ok={p.student} /></Td>
            <Td className="text-center"><Cell ok={p.admin} /></Td>
            <Td className="text-center"><Cell ok={p.superadmin} /></Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
