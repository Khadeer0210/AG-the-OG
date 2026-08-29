import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, AlertTriangle, Check, X } from 'lucide-react'
import { useAppContext } from '../context/AppContext'

const sevMap = {
  red: { bg: 'var(--color-alert-soft)', border: 'var(--color-alert)', icon: AlertTriangle },
  amber: { bg: 'var(--color-turmeric-soft)', border: 'var(--color-turmeric)', icon: AlertTriangle },
  blue: { bg: 'var(--color-rain-soft)', border: 'var(--color-rain)', icon: Bell },
}

export default function Notifications() {
  const { t } = useTranslation()
  const { alerts: contextAlerts, fetchAlerts } = useAppContext()
  const [alerts, setAlerts] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (contextAlerts && contextAlerts.length > 0) {
      setAlerts(contextAlerts.map(a => ({ ...a, read: a.read_flag || a.read || false })))
    }
  }, [contextAlerts])

  const filtered = filter === 'all' ? alerts
    : filter === 'unread' ? alerts.filter(a => !a.read)
    : alerts.filter(a => a.severity === filter)

  const markRead = (id) => setAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a))
  const dismiss = (id) => setAlerts(alerts.filter(a => a.id !== id))

  const filterLabels = {
    all: t('common.all'),
    unread: t('notifications.unread'),
    red: t('notifications.critical'),
    amber: t('notifications.warning'),
    blue: t('notifications.info'),
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <div className="eyebrow-label">
          <Bell size={13} /> Real-Time Outbreak & Climate Alerts
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold m-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            {t('nav.notifications')} <span className="text-gold-italic">Center</span> 🔔
          </h1>
          <span className="chip chip-danger">{alerts.filter(a => !a.read).length} {t('notifications.unread')}</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {['all', 'unread', 'red', 'amber', 'blue'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-medium capitalize shrink-0 transition-all"
            style={{
              background: filter === f ? 'var(--color-paddy-soft)' : 'var(--color-canvas)',
              color: filter === f ? 'var(--color-paddy)' : 'var(--color-muted)',
              border: `1px solid ${filter === f ? 'var(--color-paddy)' : 'var(--color-card-border)'}`,
              cursor: 'pointer',
            }}>
            {filterLabels[f] || f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(alert => {
          const sev = sevMap[alert.severity] || sevMap.blue
          const Icon = sev.icon
          return (
            <div key={alert.id} className="card p-4 flex gap-3 transition-all"
              style={{ borderLeft: `4px solid ${sev.border}`, opacity: alert.read ? 0.7 : 1 }}>
              <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center" style={{ background: sev.bg }}>
                <Icon size={16} style={{ color: sev.border }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold">{alert.title}</span>
                  {!alert.read && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-alert)' }} />}
                  {alert.action_required ? <span className="chip chip-danger text-[9px]">{t('dashboard.action_required')}</span> : null}
                </div>
                <p className="text-xs m-0 mb-1" style={{ color: 'var(--color-muted)' }}>{alert.body}</p>
                <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{alert.created_at}</span>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {!alert.read && (
                  <button onClick={() => markRead(alert.id)} className="p-1.5 rounded-lg" title={t('notifications.mark_read')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-paddy)' }}>
                    <Check size={14} />
                  </button>
                )}
                <button onClick={() => dismiss(alert.id)} className="p-1.5 rounded-lg" title={t('dashboard.dismiss')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="card p-8 text-center">
            <Bell size={40} className="mx-auto mb-3" style={{ color: 'var(--color-muted)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('notifications.no_alerts')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
