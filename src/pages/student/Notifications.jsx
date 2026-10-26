import { useState } from 'react'
import { BellOff, CheckCheck } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { Card, PageHeader, Tabs, Button, EmptyState } from '../../components/ui'
import { NotificationItem, NOTIF_TYPES } from '../../components/NotificationItem'
import { useDocumentTitle } from '../../lib/hooks'

export default function Notifications() {
  useDocumentTitle('Notifications')
  const { notifications, markNotification } = useData()
  const [tab, setTab] = useState('all')
  const unread = notifications.filter((n) => !n.read).length
  const types = [...new Set(notifications.map((n) => n.type))]
  const rows = notifications.filter((n) => (tab === 'all' ? true : tab === 'unread' ? !n.read : n.type === tab))

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Payment updates, reminders, announcements and security alerts."
        breadcrumbs={[{ label: 'Notifications' }]}
        actions={<Button variant="secondary" icon={CheckCheck} onClick={() => markNotification('all')} disabled={!unread}>Mark all as read</Button>}
      />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: 'All', count: notifications.length },
          { value: 'unread', label: 'Unread', count: unread },
          ...types.map((t) => ({ value: t, label: NOTIF_TYPES[t]?.label || t })),
        ]}
      />
      <Card className="p-1.5">
        {rows.length === 0 ? (
          <EmptyState icon={BellOff} title={tab === 'unread' ? 'You’re all caught up' : 'No notifications'}>
            {tab === 'unread' ? 'You have no unread notifications.' : 'Notifications about your payments will appear here.'}
          </EmptyState>
        ) : (
          <ul className="space-y-0.5">
            {rows.map((n) => (
              <li key={n.id}>
                <NotificationItem n={n} onClick={() => markNotification(n.id, !n.read)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-center text-xs text-muted">Click a notification to toggle read/unread.</p>
    </>
  )
}
