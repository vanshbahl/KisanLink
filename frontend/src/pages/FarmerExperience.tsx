import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BadgeIndianRupee, BarChart3, Building2, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, ClipboardCheck, Clock3, Edit3, Eye, IndianRupee, Leaf, LogOut, MapPin, PackageCheck, Phone, Plus, Save, ShoppingBasket, Sprout, Trash2, Truck, UserRound, WalletCards, XCircle } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { ProductImage } from '../components/ProductImage'
import { StatusBadge } from '../components/StatusBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { roleKey } from '../i18n'
import { farmerText, type FarmerFeatureKey } from '../i18n/farmerFeature'
import { prototypeService } from '../services/prototypeService'
import type { FarmerListing, FarmerOrder, FarmerProfileData, ListingStatus, OrderStatus, Pickup } from '../types'
import { roleHome } from '../utils/routes'

const crops = [
  { en: 'Fresh Tomatoes', hi: 'ताज़े टमाटर', image: '/assets/produce/tomato.webp', visual: 'tomato' as const, category: 'Vegetables' as const, mandi: 24, recommended: 32 },
  { en: 'Baby Spinach', hi: 'बेबी पालक', image: '/assets/produce/spinach.webp', visual: 'leafy' as const, category: 'Vegetables' as const, mandi: 35, recommended: 42 },
  { en: 'New Potatoes', hi: 'नए आलू', image: '/assets/produce/potato.webp', visual: 'potato' as const, category: 'Staples' as const, mandi: 21, recommended: 25 },
  { en: 'Sharbati Wheat', hi: 'शरबती गेहूं', image: '/assets/produce/wheat.webp', visual: 'grain' as const, category: 'Grains' as const, mandi: 31, recommended: 37 },
  { en: 'Sweet Carrots', hi: 'मीठी गाजर', image: '/assets/produce/carrot.webp', visual: 'root' as const, category: 'Vegetables' as const, mandi: 29, recommended: 36 },
]
const day = (offset: number) => { const date = new Date(); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10) }
const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

function useFeatureText() {
  const { language } = useLanguage()
  return { language, f: (key: FarmerFeatureKey, values?: Record<string, string | number>) => farmerText(language, key, values) }
}

function LoadState({ error, retry }: { error?: string | null; retry?: () => void }) {
  const { f } = useFeatureText()
  if (!error) return <DashboardSkeleton />
  return <div className="error-panel"><h2>{error}</h2>{retry && <button className="btn btn-primary" onClick={retry}>{f('retry')}</button>}</div>
}

const statusKey: Record<OrderStatus, FarmerFeatureKey> = { new: 'new', accepted: 'accepted', preparing: 'preparing', pickup_scheduled: 'pickupScheduled', in_transit: 'inTransit', delivered: 'delivered', cancelled: 'cancelled' }
const listingKey: Record<ListingStatus, FarmerFeatureKey> = { active: 'active', draft: 'draft', paused: 'paused', sold: 'sold', unavailable: 'unavailable' }
const pickupKey = { scheduled: 'scheduled', driver_assigned: 'driverAssigned', arriving: 'arriving', collected: 'collected', in_transit: 'inTransit', completed: 'completed' } as const
const tone = (status: string): 'red' | 'amber' | 'neutral' | 'green' => status === 'cancelled' || status === 'unavailable' ? 'red' : status === 'new' || status === 'draft' ? 'amber' : status === 'paused' ? 'neutral' : 'green'
const buyerTypeLabel = (language: 'en' | 'hi', buyerType: FarmerOrder['buyerType']) => language === 'hi' ? buyerType === 'Consumer' ? 'ग्राहक' : 'थोक खरीदार' : buyerType

export function SellProducePage() {
  const { language, f } = useFeatureText()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const [step, setStep] = useState(1)
  const [assisted, setAssisted] = useState(params.get('assisted') === '1')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FarmerListing>(() => ({ id: `listing_${Date.now()}`, crop: params.get('crop') ?? 'Fresh Tomatoes', cropHi: 'ताज़े टमाटर', category: 'Vegetables', imageSrc: '/assets/produce/tomato.webp', visual: 'tomato', quantityKg: 100, remainingKg: 100, allocatedKg: 0, unit: 'kg', grade: 'Grade A', harvestDate: day(0), availableFrom: day(1), farmingMethod: '', notes: '', pricePerKg: 32, mandiPricePerKg: 24, farm: 'Green Field Farm', pickupDate: day(2), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup', status: 'draft', assisted: false, views: 0, inquiries: 0, createdAt: day(0) }))

  useEffect(() => { if (editId) prototypeService.getListing(editId).then((item) => item && setForm(item)) }, [editId])
  const selectedCrop = crops.find((item) => item.en === form.crop)
  const chooseCrop = (crop: typeof crops[number]) => setForm((current) => ({ ...current, crop: crop.en, cropHi: crop.hi, imageSrc: crop.image, visual: crop.visual, category: crop.category, mandiPricePerKg: crop.mandi, pricePerKg: crop.recommended }))
  const update = <K extends keyof FarmerListing>(key: K, value: FarmerListing[K]) => setForm((current) => ({ ...current, [key]: value }))
  const validate = () => form.crop.trim() && form.quantityKg > 0 && form.pricePerKg > 0 && form.harvestDate && form.availableFrom
  const save = async (status: ListingStatus) => {
    if (!validate()) { showToast(f('requiredFields')); return }
    setSaving(true)
    const next = { ...form, status, remainingKg: form.quantityKg - form.allocatedKg, assisted }
    await prototypeService.saveListing(next)
    setSaving(false)
    showToast(status === 'draft' ? f('draftSaved') : f('listingPublished'))
    navigate(status === 'draft' ? '/farmer/produce?tab=draft' : `/farmer/produce/${next.id}`)
  }
  const discard = () => { if (window.confirm(f('confirmation'))) navigate('/farmer/produce') }
  const filtered = crops.filter((item) => `${item.en} ${item.hi}`.toLowerCase().includes(search.toLowerCase()))

  return <div className="page farmer-feature-page">
    <div className="page-title-row"><div><span className="eyebrow"><Sprout size={15} /> {f('standardMode')}</span><h1>{f('sellTitle')}</h1></div><button className="btn btn-secondary" onClick={() => setAssisted(!assisted)}><CircleHelp size={18} />{assisted ? f('standardMode') : f('assisted')}</button></div>
    {!assisted && <div className="stepper" aria-label={f('sellTitle')}>{(['crop','details','price','pickup','review'] as FarmerFeatureKey[]).map((key, index) => <button key={key} className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} onClick={() => index + 1 < step && setStep(index + 1)}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span><small>{f(key)}</small></button>)}</div>}
    {assisted ? <section className="feature-card assisted-form"><div className="assisted-head"><span><Phone size={24} /></span><div><h2>{f('needHelpListing')}</h2><p>{f('assistedHint')}</p></div><StatusBadge tone="amber">{f('callCenterBadge')}</StatusBadge></div><ListingFields form={form} update={update} compact /><a className="btn btn-secondary" href="tel:18001234567"><Phone size={18} />{f('callSupport')}</a></section> :
      <section className="feature-card wizard-panel">
        {step === 1 && <><h2>{f('selectCrop')}</h2><label className="field full"><span>{f('search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={f('searchCrop')} /></label><p className="field-note">{f('recentCrops')}</p><div className="crop-picker">{filtered.map((crop) => <button key={crop.en} className={form.crop === crop.en ? 'active' : ''} onClick={() => chooseCrop(crop)}><img src={crop.image} alt="" /><strong>{language === 'hi' ? crop.hi : crop.en}</strong>{form.crop === crop.en && <CheckCircle2 size={18} />}</button>)}<button onClick={() => update('crop', '')}><Plus size={28} /><strong>{f('otherCrop')}</strong></button></div>{!selectedCrop && <label className="field full"><span>{f('otherCrop')}</span><input value={form.crop} onChange={(event) => update('crop', event.target.value)} required /></label>}</>}
        {step === 2 && <ListingFields form={form} update={update} />}
        {step === 3 && <PriceStep form={form} update={update} />}
        {step === 4 && <PickupStep form={form} update={update} />}
        {step === 5 && <ReviewStep form={form} assisted={assisted} onEdit={setStep} />}
      </section>}
    <div className="wizard-actions"><button className="btn btn-ghost" onClick={discard}><Trash2 size={17} />{f('discard')}</button><div>{!assisted && step > 1 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}><ArrowLeft size={17} />{f('back')}</button>}<button className="btn btn-secondary" disabled={saving} onClick={() => save('draft')}><Save size={17} />{f('saveDraft')}</button>{!assisted && step < 5 ? <button className="btn btn-primary" onClick={() => setStep(step + 1)}>{f('next')}<ArrowRight size={17} /></button> : <button className="btn btn-primary" disabled={saving} onClick={() => save('active')}>{saving ? f('loading') : f('publish')}<Check size={17} /></button>}</div></div>
  </div>
}

function ListingFields({ form, update, compact = false }: { form: FarmerListing; update: <K extends keyof FarmerListing>(key: K, value: FarmerListing[K]) => void; compact?: boolean }) {
  const { f } = useFeatureText()
  return <div className="form-grid">
    {compact && <label className="field full"><span>{f('crop')} *</span><input value={form.crop} onChange={(e) => update('crop', e.target.value)} /></label>}
    <label className="field"><span>{f('quantity')} *</span><input type="number" min="1" value={form.quantityKg} onChange={(e) => update('quantityKg', Number(e.target.value))} /></label>
    <label className="field"><span>{f('unit')}</span><select value={form.unit} onChange={(e) => update('unit', e.target.value as FarmerListing['unit'])}><option value="kg">kg</option><option value="quintal">quintal</option><option value="tonne">tonne</option></select></label>
    <label className="field"><span>{f('grade')}</span><select value={form.grade} onChange={(e) => update('grade', e.target.value as FarmerListing['grade'])}><option>Grade A</option><option>Grade A+</option></select></label>
    <label className="field"><span>{f('harvestDate')} *</span><input type="date" value={form.harvestDate} onChange={(e) => update('harvestDate', e.target.value)} /></label>
    {!compact && <><label className="field"><span>{f('availableFrom')} *</span><input type="date" value={form.availableFrom} onChange={(e) => update('availableFrom', e.target.value)} /></label><label className="field"><span>{f('farmingMethod')}</span><select value={form.farmingMethod} onChange={(e) => update('farmingMethod', e.target.value)}><option value="">—</option><option value="Conventional">{f('conventional')}</option><option value="Organic">{f('organic')}</option><option value="Natural farming">{f('natural')}</option></select></label><label className="field full"><span>{f('notes')}</span><textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} /></label></>}
    {compact && <><label className="field"><span>{f('yourPrice')} *</span><input type="number" min="1" value={form.pricePerKg} onChange={(e) => update('pricePerKg', Number(e.target.value))} /></label><label className="field"><span>{f('pickupDate')}</span><input type="date" value={form.pickupDate} onChange={(e) => update('pickupDate', e.target.value)} /></label></>}
  </div>
}

function PriceStep({ form, update }: { form: FarmerListing; update: <K extends keyof FarmerListing>(key: K, value: FarmerListing[K]) => void }) {
  const { f } = useFeatureText(); const earnings = form.quantityKg * form.pricePerKg; const extra = form.quantityKg * (form.pricePerKg - form.mandiPricePerKg)
  return <><div className="guidance-head"><span><BadgeIndianRupee size={24} /></span><div><h2>{f('smartPrice')}</h2><p>{f('simulated')}</p></div><StatusBadge tone="amber">{f('prototypeInsight')}</StatusBadge></div><div className="price-guide-grid"><article><span>{f('mandiBenchmark')}</span><strong>₹{form.mandiPricePerKg}{f('priceUnit')}</strong></article><article className="recommended"><span>{f('recommendedRange')}</span><strong>₹{form.mandiPricePerKg + 6}–₹{form.mandiPricePerKg + 9}{f('priceUnit')}</strong><button onClick={() => update('pricePerKg', form.mandiPricePerKg + 8)}>{f('useRecommended')}</button></article></div><label className="field full price-input"><span>{f('yourPrice')} *</span><div><IndianRupee size={20} /><input type="number" min="1" value={form.pricePerKg} onChange={(e) => update('pricePerKg', Number(e.target.value))} /><b>{f('priceUnit')}</b></div></label><div className="earning-preview"><div><span>{f('expectedEarnings')}</span><strong>{money(earnings)}</strong></div><div><span>{f('extraVsMandi')}</span><strong className={extra >= 0 ? 'positive' : 'negative'}>{extra >= 0 ? '+' : ''}{money(extra)}</strong></div></div></>
}

function PickupStep({ form, update }: { form: FarmerListing; update: <K extends keyof FarmerListing>(key: K, value: FarmerListing[K]) => void }) {
  const { f } = useFeatureText()
  return <><h2>{f('choosePickup')}</h2><div className="choice-grid"><button className={form.fulfillment === 'pickup' ? 'active' : ''} onClick={() => update('fulfillment', 'pickup')}><Truck size={25} /><strong>{f('kisanPickup')}</strong><small>{f('support')}</small></button><button className={form.fulfillment === 'self_delivery' ? 'active' : ''} onClick={() => update('fulfillment', 'self_delivery')}><PackageCheck size={25} /><strong>{f('selfDelivery')}</strong></button></div><div className="form-grid"><label className="field full"><span>{f('farm')}</span><select value={form.farm} onChange={(e) => update('farm', e.target.value)}><option>Green Field Farm</option></select></label><label className="field"><span>{f('pickupDate')}</span><input type="date" value={form.pickupDate} onChange={(e) => update('pickupDate', e.target.value)} /></label><label className="field"><span>{f('timeWindow')}</span><select value={form.pickupWindow} onChange={(e) => update('pickupWindow', e.target.value)}><option value="Morning · 7–10 AM">{f('morning')}</option><option value="Afternoon · 1–4 PM">{f('afternoon')}</option><option value="Evening · 4–7 PM">{f('evening')}</option></select></label></div><a href="tel:18001234567" className="inline-support"><Phone size={17} />{f('callSupport')} · 1800 123 4567</a></>
}

function ReviewStep({ form, assisted, onEdit }: { form: FarmerListing; assisted: boolean; onEdit: (step: number) => void }) {
  const { language, f } = useFeatureText()
  const rows = [[f('crop'), language === 'hi' ? form.cropHi : form.crop, 1], [f('quantity'), `${form.quantityKg} ${form.unit}`, 2], [f('price'), `₹${form.pricePerKg}${f('priceUnit')}`, 3], [f('pickup'), `${form.pickupDate} · ${form.pickupWindow}`, 4]] as const
  return <><div className="review-hero"><ProductImage imageSrc={form.imageSrc} visual={form.visual} alt={form.crop} size="mini" /><div><StatusBadge tone="green">{f('review')}</StatusBadge><h2>{language === 'hi' ? form.cropHi : form.crop}</h2><p>{form.grade} · {form.farmingMethod}</p>{assisted && <small>{f('callCenterBadge')}</small>}</div></div><div className="review-list">{rows.map(([label, value, target]) => <div key={label}><span>{label}</span><strong>{value}</strong><button onClick={() => onEdit(target)}><Edit3 size={15} />{f('editStep')}</button></div>)}</div></>
}

export function FarmerProduceDetailPage() {
  const { id } = useParams(); const { language, f } = useFeatureText(); const [item, setItem] = useState<FarmerListing | null | undefined>(undefined)
  useEffect(() => { if (id) prototypeService.getListing(id).then(setItem) }, [id]); if (item === undefined) return <LoadState />; if (!item) return <Empty message={f('noResults')} />
  return <div className="page farmer-feature-page narrow-page"><Link className="back-link" to="/farmer/produce"><ArrowLeft size={17} />{f('allProduce')}</Link><div className="detail-title"><div><span className="eyebrow">{f('ref')} · {item.id}</span><h1>{f('produceDetail')}</h1></div><StatusBadge tone={tone(item.status)}>{f(listingKey[item.status])}</StatusBadge></div><section className="feature-card listing-detail-hero"><ProductImage imageSrc={item.imageSrc} visual={item.visual} alt={item.crop} size="hero" /><div><div className="status-line">{item.assisted && <StatusBadge tone="amber">{f('callCenterBadge')}</StatusBadge>}</div><h2>{language === 'hi' ? item.cropHi : item.crop}</h2><p>{item.grade} · {item.farmingMethod}</p><strong>₹{item.pricePerKg}{f('priceUnit')}</strong><div className="listing-facts"><span><small>{f('stock')}</small><b>{item.remainingKg} kg</b></span><span><small>{f('allocated')}</small><b>{item.allocatedKg} kg</b></span><span><small>{f('mandiBenchmark')}</small><b>₹{item.mandiPricePerKg}/kg</b></span></div><Link className="btn btn-primary" to={`/farmer/sell?edit=${item.id}`}><Edit3 size={17} />{f('edit')}</Link></div></section><section className="feature-card"><h2>{f('activityTimeline')}</h2><div className="activity-list"><div><span><Check size={15} /></span><div><strong>{f('publish')}</strong><small>{item.createdAt}</small></div></div>{item.views > 0 && <div><span><Eye size={15} /></span><div><strong>{item.views} {f('views')} · {item.inquiries} {f('inquiries')}</strong><small>{f('nearbyInterest')}</small></div></div>}{item.allocatedKg > 0 && <div><span><PackageCheck size={15} /></span><div><strong>{f('orderReceived')}</strong><small>{item.allocatedKg} kg</small></div></div>}<div><span><Edit3 size={15} /></span><div><strong>{f('quantityAdjusted')}</strong><small>{item.remainingKg} kg {f('remaining')}</small></div></div></div></section></div>
}

export function FarmerOrdersPage() {
  const { language, f } = useFeatureText(); const { showToast } = useToast(); const [orders, setOrders] = useState<FarmerOrder[] | null>(null); const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const load = () => prototypeService.getOrders().then(setOrders); useEffect(() => { load() }, [])
  const update = async (id: string, status: OrderStatus) => { await prototypeService.updateOrder(id, status); showToast(f('orderUpdated')); load() }
  if (!orders) return <LoadState />
  const visible = filter === 'all' ? orders : orders.filter((order) => order.status === filter)
  return <div className="page farmer-feature-page"><div className="page-title-row"><div><span className="eyebrow"><PackageCheck size={15} /> {f('demoBadge')}</span><h1>{f('ordersTitle')}</h1><p>{f('ordersSubtitle')}</p></div></div><div className="tab-strip">{(['all','new','accepted','preparing','pickup_scheduled','in_transit','delivered','cancelled'] as const).map((key) => <button className={filter === key ? 'active' : ''} onClick={() => setFilter(key)} key={key}>{key === 'all' ? f('all') : f(statusKey[key])}<span>{orders.filter((order) => key === 'all' || order.status === key).length}</span></button>)}</div><div className="order-list">{visible.map((order) => <article className="order-card farmer-order-card" key={order.id}><div className="order-card-head"><div><span>{order.id} · {buyerTypeLabel(language, order.buyerType)}</span><h2>{language === 'hi' ? order.cropHi : order.crop}</h2><p>{f('buyer')}: {order.buyerName}</p></div><StatusBadge tone={tone(order.status)}>{f(statusKey[order.status])}</StatusBadge></div><div className="order-metrics"><div><span>{f('quantity')}</span><strong>{f('quantityKg', { value: order.quantityKg })}</strong></div><div><span>{f('yourPrice')}</span><strong>₹{order.ratePerKg}{f('priceUnit')}</strong></div><div><span>{f('farmerPayout')}</span><strong>{money(order.farmerPayout)}</strong></div><div><span>{f('payment')}</span><strong>{f(order.paymentStatus as 'pending' | 'paid' | 'processing')}</strong></div></div><div className="order-actions"><Link className="btn btn-secondary" to={`/farmer/orders/${order.id}`}>{f('orderDetail')}<ChevronRight size={16} /></Link>{order.status === 'new' && <><button className="btn btn-primary" onClick={() => update(order.id, 'accepted')}><Check size={17} />{f('accept')}</button><button className="btn btn-ghost danger" onClick={() => update(order.id, 'cancelled')}><XCircle size={17} />{f('decline')}</button></>}{order.status === 'accepted' && <button className="btn btn-primary" onClick={() => update(order.id, 'preparing')}><ClipboardCheck size={17} />{f('markReady')}</button>}{order.pickupId && <Link className="btn btn-ghost" to="/farmer/pickups"><Truck size={17} />{f('viewPickup')}</Link>}</div></article>)}{!visible.length && <Empty message={f('noResults')} />}</div></div>
}

export function FarmerOrderDetailPage() {
  const { id } = useParams(); const { language, f } = useFeatureText(); const [order, setOrder] = useState<FarmerOrder | null | undefined>(undefined)
  useEffect(() => { if (id) prototypeService.getOrder(id).then(setOrder) }, [id]); if (order === undefined) return <LoadState />; if (!order) return <Empty message={f('noResults')} />
  const stages: OrderStatus[] = ['new','accepted','preparing','pickup_scheduled','in_transit','delivered']; const current = stages.indexOf(order.status)
  return <div className="page farmer-feature-page narrow-page"><Link className="back-link" to="/farmer/orders"><ArrowLeft size={17} />{f('ordersTitle')}</Link><div className="detail-title"><div><span className="eyebrow">{f('ref')} · {order.id}</span><h1>{f('orderDetail')}</h1><p>{order.buyerName} · {order.buyerType}</p></div><StatusBadge tone={tone(order.status)}>{f(statusKey[order.status])}</StatusBadge></div><section className="feature-card detail-product"><div><h2>{language === 'hi' ? order.cropHi : order.crop}</h2><p>{order.quantityKg} kg × ₹{order.ratePerKg}/kg</p></div><strong>{money(order.total)}</strong></section><section className="feature-card"><h2>{f('logisticsBreakdown')}</h2><div className="breakdown"><div><span>{f('gross')}</span><strong>{money(order.total)}</strong></div><div><span>{f('logisticsFee')}</span><strong>−{money(order.logisticsFee)}</strong></div><div><span>{f('platformFee')}</span><strong>−{money(order.platformFee)}</strong></div><div className="total"><span>{f('farmerPayout')}</span><strong>{money(order.farmerPayout)}</strong></div></div></section><section className="feature-card"><h2>{f('timeline')}</h2><div className="timeline">{stages.map((status, index) => <div className={index <= current ? 'complete' : ''} key={status}><span>{index <= current ? <Check size={14} /> : index + 1}</span><strong>{f(statusKey[status])}</strong></div>)}</div></section><a className="btn btn-secondary btn-full" href="tel:18001234567"><Phone size={17} />{f('contactSupport')}</a></div>
}

export function FarmerEarningsPage() {
  const { language, f } = useFeatureText(); const [items, setItems] = useState<Awaited<ReturnType<typeof prototypeService.getEarnings>> | null>(null); useEffect(() => { prototypeService.getEarnings().then(setItems) }, []); if (!items) return <LoadState />
  const paid = items.filter((x) => x.status === 'paid').reduce((sum, x) => sum + x.net, 0); const pending = items.filter((x) => x.status === 'pending').reduce((sum, x) => sum + x.net, 0); const gain = items.reduce((sum, x) => sum + x.net - x.mandiEquivalent, 0); const mandi = items.reduce((sum, x) => sum + x.mandiEquivalent, 0); const percent = mandi ? gain / mandi * 100 : 0
  return <div className="page farmer-feature-page"><div className="page-title-row"><div><span className="eyebrow"><WalletCards size={15} /> {f('demoBadge')}</span><h1>{f('earningsTitle')}</h1></div></div><div className="earnings-summary"><article><IndianRupee /><span>{f('thisMonth')}</span><strong>{money(paid + pending)}</strong></article><article><Clock3 /><span>{f('pendingPayout')}</span><strong>{money(pending)}</strong></article><article><CheckCircle2 /><span>{f('completedPayout')}</span><strong>{money(paid)}</strong></article></div><section className="value-gain-card"><div><span className="eyebrow light">{f('valueGain')}</span><h2>+{money(gain)}</h2><p>{f('extraIncome')}</p></div><strong>+{percent.toFixed(1)}%<small>{f('betterPrice')}</small></strong></section><section className="feature-card"><div className="card-heading"><div><span className="eyebrow">{f('monthlyTrend')}</span><h2>{f('transactions')}</h2></div><MiniBars /></div><div className="transaction-list">{items.map((item) => <div key={item.id}><span className="transaction-icon"><IndianRupee size={18} /></span><div><strong>{language === 'hi' ? item.cropHi : item.crop}</strong><small>{item.orderId} · {item.date}</small></div><span><strong>{money(item.net)}</strong><small>{f(item.status)}</small></span></div>)}</div></section></div>
}

function MiniBars() { return <div className="mini-bars" aria-hidden="true">{[34,52,43,68,60,88,76].map((height, index) => <i style={{ height: `${height}%` }} key={index} />)}</div> }

export function FarmerInsightsPage() {
  const { f } = useFeatureText(); const [crop, setCrop] = useState('Tomatoes'); const data = crop === 'Tomatoes' ? { mandi: 24, direct: 32, range: '₹31–₹33', interest: 46 } : { mandi: 35, direct: 42, range: '₹40–₹44', interest: 28 }
  return <div className="page farmer-feature-page"><div className="page-title-row"><div><span className="eyebrow"><BarChart3 size={15} /> {f('prototypeInsight')}</span><h1>{f('insightsTitle')}</h1></div><label className="field crop-select"><span>{f('crop')}</span><select value={crop} onChange={(e) => setCrop(e.target.value)}><option>Tomatoes</option><option>Spinach</option></select></label></div><section className="opportunity-card"><div><span className="eyebrow light"><Leaf size={15} /> {f('opportunity')}</span><h2>{f('opportunityText')}</h2><Link className="btn btn-light" to="/farmer/sell?crop=Fresh%20Tomatoes">{f('listTomatoes')}<ArrowRight size={17} /></Link></div><div className="demand-orb"><strong>{f('high')}</strong><small>{f('demand')}</small></div></section><div className="insight-grid"><article className="feature-card insight-metric"><span>{f('mandiBenchmark')}</span><strong>₹{data.mandi}/kg</strong><small>{f('demoBadge')}</small></article><article className="feature-card insight-metric highlight"><span>{f('directAverage')}</span><strong>₹{data.direct}/kg</strong><small>{data.range} · {f('recommendedRange')}</small></article><article className="feature-card insight-metric"><span>{f('nearbyInterest')}</span><strong>{data.interest}</strong><small>{f('bulkSignal')} · 1.8 tonnes</small></article></div><section className="feature-card trend-card"><div><span className="eyebrow">{f('priceTrend')}</span><h2>{f('directAverage')}</h2></div><div className="trend-line" aria-label="7 day simulated price trend"><svg viewBox="0 0 600 150" preserveAspectRatio="none"><path d="M0 122 C70 112 84 130 145 92 S240 100 300 65 S390 73 450 42 S535 55 600 20" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" /></svg><div>{[27,28,28,30,29,31,32].map((value) => <span key={`${value}-${Math.random()}`}>₹{value}</span>)}</div></div><p className="insight-explanation">{f('opportunityText')}</p></section></div>
}

export function FarmerPickupsPage() {
  const { language, f } = useFeatureText(); const [items, setItems] = useState<Pickup[] | null>(null); useEffect(() => { prototypeService.getPickups().then(setItems) }, []); if (!items) return <LoadState />
  const stages = ['scheduled','driver_assigned','arriving','collected','in_transit','completed'] as const
  return <div className="page farmer-feature-page"><div className="page-title-row"><div><span className="eyebrow"><Truck size={15} /> {f('demoBadge')}</span><h1>{f('pickupsTitle')}</h1><p>{f('pickupSubtitle')}</p></div></div><div className="pickup-list">{items.map((item) => { const current = stages.indexOf(item.status); return <article className="feature-card pickup-detail" key={item.id}><div className="pickup-detail-head"><div><span>{item.id} · {item.orderId}</span><h2>{language === 'hi' ? item.cropHi : item.crop}</h2><p>{item.quantityKg} kg</p></div><StatusBadge tone="green">{f(pickupKey[item.status])}</StatusBadge></div><div className="pickup-info"><div><CalendarDays /><span><small>{f('pickupDate')}</small><strong>{item.date}</strong></span></div><div><Clock3 /><span><small>{f('timeWindow')}</small><strong>{item.timeWindow}</strong></span></div><div><UserRound /><span><small>{f('driver')}</small><strong>{item.driver}</strong></span></div><div><Truck /><span><small>{f('vehicle')}</small><strong>{item.vehicle}</strong></span></div><div className="full"><MapPin /><span><small>{f('address')}</small><strong>{item.farmAddress}</strong></span></div></div><div className="timeline compact">{stages.map((stage, index) => <div className={index <= current ? 'complete' : ''} key={stage}><span>{index <= current ? <Check size={13} /> : index + 1}</span><strong>{f(pickupKey[stage])}</strong></div>)}</div><a className="btn btn-secondary btn-full" href="tel:18001234567"><Phone size={17} />{f('contactSupport')}</a></article>})}{!items.length && <Empty message={f('noPickups')} />}</div></div>
}

export function FarmerProfilePage() {
  const { language, setLanguage, t } = useLanguage(); const { f } = useFeatureText(); const { showToast } = useToast(); const { switchRole, logout } = useAuth(); const navigate = useNavigate(); const [profile, setProfile] = useState<FarmerProfileData | null>(null); const [saving, setSaving] = useState(false); useEffect(() => { prototypeService.getProfile().then(setProfile) }, []); if (!profile) return <LoadState />
  const update = <K extends keyof FarmerProfileData>(key: K, value: FarmerProfileData[K]) => setProfile((current) => current ? { ...current, [key]: value } : current)
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); await prototypeService.saveProfile({ ...profile, language }); setSaving(false); showToast(f('profileSaved')) }
  const switchDemo = async (role: 'consumer' | 'bulk' | 'logistics') => { await switchRole(role); navigate(roleHome(role)) }
  return <div className="page farmer-feature-page">
    <div className="page-title-row"><div><span className="eyebrow"><UserRound size={15} /> {f('verification')}</span><h1>{f('profileTitle')}</h1></div></div>
    <form className="profile-form" onSubmit={submit}>
      <section className="feature-card profile-account-card"><h2>{f('personal')}</h2><div className="form-grid"><label className="field"><span>{f('name')}</span><input value={profile.name} onChange={(e) => update('name', e.target.value)} /></label><label className="field"><span>{f('phone')}</span><input value={profile.phone} onChange={(e) => update('phone', e.target.value)} /></label><label className="field full"><span>{f('language')}</span><select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}><option value="en">English</option><option value="hi">हिन्दी</option></select></label></div><div className="profile-card-divider" /><h2>{f('payout')}</h2><div className="form-grid"><label className="field"><span>{f('payout')}</span><select value={profile.payoutMethod} onChange={(e) => update('payoutMethod', e.target.value as FarmerProfileData['payoutMethod'])}><option>UPI</option><option>Bank account</option></select></label><Field label={f('maskedAccount')} value={profile.payoutMasked} onChange={(v) => update('payoutMasked', v)} /></div><div className="verification-grid"><span><CheckCircle2 />{f('farmerVerified')}</span><span><CheckCircle2 />{f('farmVerified')}</span><span><CheckCircle2 />{f('identity')}: {profile.identityStatus}</span></div></section>
      <section className="feature-card"><h2>{f('farmDetails')}</h2><div className="form-grid"><Field label={f('farmName')} value={profile.farmName} onChange={(v) => update('farmName', v)} /><Field label={f('village')} value={profile.village} onChange={(v) => update('village', v)} /><Field label={f('district')} value={profile.district} onChange={(v) => update('district', v)} /><Field label={f('state')} value={profile.state} onChange={(v) => update('state', v)} /><label className="field"><span>{f('farmSize')}</span><input type="number" value={profile.farmSizeAcres} onChange={(e) => update('farmSizeAcres', Number(e.target.value))} /></label><Field label={f('mainCrops')} value={profile.mainCrops} onChange={(v) => update('mainCrops', v)} /><label className="field full"><span>{f('address')}</span><textarea value={profile.pickupLocation} onChange={(e) => update('pickupLocation', e.target.value)} /></label></div></section>
      <div className="profile-actions"><button className="btn btn-primary btn-large" disabled={saving}>{saving ? f('loading') : f('saveChanges')}</button><a className="btn btn-secondary btn-large" href="tel:18001234567"><Phone size={18} />{f('callSupport')}</a></div>
    </form>
    <section className="demo-switch-card farmer-demo-controls"><div><span className="eyebrow">{t('demoControls')}</span><h2>{t('switchDemoRole')}</h2><p>{t('switchDemoCopy')}</p></div><div className="demo-switch-options"><button onClick={() => switchDemo('consumer')}><span><ShoppingBasket size={22} /></span><strong>{t(roleKey.consumer)}</strong></button><button onClick={() => switchDemo('bulk')}><span><Building2 size={22} /></span><strong>{t(roleKey.bulk)}</strong></button><button onClick={() => switchDemo('logistics')}><span><Truck size={22} /></span><strong>{t(roleKey.logistics)}</strong></button><button onClick={() => { logout(); window.location.replace('/') }}><span><LogOut size={22} /></span><strong>{t('logOut')}</strong></button></div></section>
  </div>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} /></label> }
function Empty({ message }: { message: string }) { return <div className="empty-feature"><Sprout size={32} /><h2>{message}</h2></div> }
