import { Bell, CheckCheck, Clock3 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { farmerText } from '../i18n/farmerFeature'
import { prototypeService } from '../services/prototypeService'
import type { PrototypeNotification } from '../types'

export function NotificationCenter() {
  const { session } = useAuth(); const { language, t } = useLanguage(); const f = (key: Parameters<typeof farmerText>[1]) => farmerText(language, key); const [open, setOpen] = useState(false); const [items, setItems] = useState<PrototypeNotification[]>([]); const root = useRef<HTMLDivElement>(null); const navigate = useNavigate()
  const load = () => session && prototypeService.getNotifications(session.role).then(setItems)
  useEffect(() => { if (session) prototypeService.getNotifications(session.role).then(setItems) }, [session])
  useEffect(() => { const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close) }, [])
  useEffect(() => { const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }; document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc) }, [])
  const readAll = async () => { if (!session) return; await prototypeService.markNotificationsRead(session.role); load() }
  const unread = items.filter((item) => !item.read).length
  return <div className="notification-center" ref={root}><button aria-label={t('notifications')} aria-expanded={open} className="icon-button" onClick={() => setOpen(!open)}><Bell size={20} />{unread > 0 && <span className="notification-count">{unread}</span>}</button>{open && <div className="notification-panel" role="dialog" aria-label={f('notifications')}><div className="notification-head"><div><span className="eyebrow">{f('notifications')}</span><h2>{unread} unread</h2></div><button onClick={readAll}><CheckCheck size={17} />{f('markAllRead')}</button></div><div className="notification-list">{items.map((item) => <button className={item.read ? '' : 'unread'} key={item.id} onClick={() => { setOpen(false); navigate(item.href) }}><span className="note-dot" /><div><strong>{language === 'hi' ? item.titleHi : item.title}</strong><p>{language === 'hi' ? item.bodyHi : item.body}</p><small><Clock3 size={12} />{new Date(item.timestamp).toLocaleTimeString(language === 'hi' ? 'hi-IN' : 'en-IN', { hour: 'numeric', minute: '2-digit' })}</small></div></button>)}{!items.length && <p className="notification-empty">{f('noNotifications')}</p>}</div></div>}</div>
}
