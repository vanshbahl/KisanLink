import { AlertTriangle, Database, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { prototypeService } from '../services/prototypeService'
import type { DemoScenario } from '../types'

/**
 * The default seed already carries the full four-role story, so each preset below is a
 * deliberate departure from it rather than a different amount of the same data.
 */
const scenarios: Array<{ id: DemoScenario; en: string; hi: string }> = [
  { id: 'full', en: 'Full connected story (default)', hi: 'पूरा जुड़ा हुआ डेमो (डिफ़ॉल्ट)' },
  { id: 'market', en: 'Market Maker corridor, pre-unlock', hi: 'मार्केट मेकर कॉरिडोर, खुलने से पहले' },
  { id: 'consumer', en: 'Household order only', hi: 'केवल घरेलू ऑर्डर' },
  { id: 'issue', en: 'Exception on the floor', hi: 'संचालन में समस्या' },
  { id: 'empty', en: 'Empty account', hi: 'खाली खाता' },
]

export function DemoControlCenter() {
  const { language } = useLanguage(); const { showToast } = useToast(); const [open, setOpen] = useState(false); const [confirmReset, setConfirmReset] = useState(false); const [busy, setBusy] = useState(false)
  const l = (en: string, hi: string) => language === 'hi' ? hi : en
  useEffect(() => { const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); setConfirmReset(false) } }; document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc) }, [])
  const run = async (scenario?: DemoScenario) => { setBusy(true); try { if (scenario) await prototypeService.seedScenario(scenario); else await prototypeService.reset(); showToast(scenario ? l('Demo scenario seeded', 'डेमो स्थिति तैयार है') : l('Demo data reset', 'डेमो डेटा रीसेट हुआ')); setConfirmReset(false); setOpen(false) } finally { setBusy(false) } }
  return <section className="demo-control-center"><button className="demo-control-trigger" onClick={() => setOpen(true)}><Database size={16} /> {l('Demo controls', 'डेमो नियंत्रण')}</button>{open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}><section className="demo-control-dialog" role="dialog" aria-modal="true" aria-labelledby="demo-control-title"><header><div><span className="eyebrow">{l('SIH prototype only', 'केवल SIH प्रोटोटाइप')}</span><h2 id="demo-control-title">{l('Demo Control Center', 'डेमो नियंत्रण केंद्र')}</h2></div><button className="icon-button" aria-label={l('Close demo controls', 'डेमो नियंत्रण बंद करें')} onClick={() => setOpen(false)}><X size={19} /></button></header><p>{l('Replace the shared prototype state with a deterministic judging scenario. Reset restores the full connected story, including farm stock consumed by a procurement run.', 'साझा प्रोटोटाइप स्थिति को निश्चित जजिंग परिदृश्य से बदलें। रीसेट पूरी कहानी वापस लाता है।')}</p><div className="demo-seed-grid">{scenarios.map((item) => <button className="btn btn-secondary" disabled={busy} key={item.id} onClick={() => run(item.id)}>{language === 'hi' ? item.hi : item.en}</button>)}</div><div className="danger-zone"><div><AlertTriangle size={18} /><span><strong>{l('Reset Demo Data', 'डेमो डेटा रीसेट करें')}</strong><small>{l('Restores the original synchronized seed.', 'मूल साझा डेमो स्थिति वापस लाता है।')}</small></span></div>{confirmReset ? <div className="confirm-actions"><button className="btn btn-ghost" disabled={busy} onClick={() => setConfirmReset(false)}>{l('Cancel', 'रद्द करें')}</button><button className="btn btn-danger" disabled={busy} onClick={() => run()}>{busy ? l('Resetting…', 'रीसेट हो रहा है…') : l('Confirm reset', 'रीसेट की पुष्टि')}</button></div> : <button className="btn btn-secondary" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> {l('Reset', 'रीसेट')}</button>}</div></section></div>}</section>
}
