import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Heart, Home, MapPin, Minus, PackageCheck, Plus, RefreshCw, Scale, ShieldCheck, ShoppingCart, Sprout, Trash2, Truck, UserRound } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { ProductImage } from '../components/ProductImage'
import { StatusBadge } from '../components/StatusBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { availableForCart, orderCosts, phase2Service } from '../services/phase2Service'
import type { Address, CartItem, ConsumerOrderStatus, ConsumerProfileData, FarmerListing } from '../types'
import { ProfilePage } from './ProfilePage'
import { MarketplaceAiTrigger } from '../components/ai/MarketplaceAiTrigger'
import { MarketplaceInsightResult } from '../components/ai/MarketplaceInsightResult'
import { basketOptimizer } from '../services/consumerIntelligenceService'

const statusLabel: Record<ConsumerOrderStatus, string> = { confirmed: 'Confirmed', farmer_preparing: 'Farmer Preparing', pickup_scheduled: 'Pickup Scheduled', collected: 'Collected', in_transit: 'In Transit', out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled' }
const tracking: ConsumerOrderStatus[] = ['confirmed', 'farmer_preparing', 'pickup_scheduled', 'collected', 'in_transit', 'out_for_delivery', 'delivered']
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`
const prettyDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export function ConsumerListingCard({ listing }: { listing: FarmerListing }) {
  const { language } = useLanguage(); const [saved, setSaved] = useState(false)
  useEffect(() => { phase2Service.saved().then((data) => setSaved(data.listingIds.includes(listing.id))) }, [listing.id])
  const isRescue = Boolean(listing.isUrgentRescue || listing.rescueStatus === 'RESCUE_ACTIVE')
  const rescuePrice = listing.rescueDiscountPricePerKg ?? Math.round(listing.pricePerKg * 0.8)
  const discountPct = Math.round(((listing.pricePerKg - rescuePrice) / listing.pricePerKg) * 100)
  return <article className="product-card"><div className="product-visual"><ProductImage imageSrc={listing.imageSrc} alt={listing.crop} visual={listing.visual} /><StatusBadge tone={isRescue ? 'red' : listing.remainingKg <= 20 ? 'amber' : 'green'}>{isRescue ? 'Urgent rescue' : listing.remainingKg ? (listing.remainingKg <= 20 ? 'Low stock' : 'Fresh supply') : 'Out of stock'}</StatusBadge><button className={`save-float ${saved ? 'active' : ''}`} aria-label="Save produce" onClick={async () => setSaved((await phase2Service.toggleSavedListing(listing.id)).includes(listing.id))}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button></div><div className="product-content"><div className="product-title-row"><div><h3>{language === 'hi' ? listing.cropHi : listing.crop}</h3><p>{listing.farm}</p></div><StatusBadge tone={isRescue ? 'red' : 'neutral'}>{isRescue ? 'Rescue sale' : listing.grade}</StatusBadge></div><p className="product-location"><MapPin size={15} />Sonipat, Haryana · 42 km</p><div className="product-price-row">{isRescue ? <div className="rescue-price-block"><span className="rescue-strike">{money(listing.pricePerKg)}</span><strong>{money(rescuePrice)}</strong><small className="rescue-discount-note">{discountPct}% off</small></div> : <div><strong>{money(listing.pricePerKg)}</strong><span>/kg</span><small>Mandi {money(listing.mandiPricePerKg)}/kg</small></div>}<Link className="btn btn-small" to={`/consumer/listing/${listing.id}`}>View <ArrowRight size={15} /></Link></div><p className="product-available"><Scale size={15} />{listing.remainingKg.toLocaleString('en-IN')} kg available</p></div></article>
}

export function ConsumerCartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>(phase2Service.cart())
  const { data: listings, loading } = useAsyncData(() => phase2Service.listings())
  const rows = availableForCart(cart, listings ?? [])
  const costs = orderCosts(rows.map((row) => ({ quantityKg: row.quantityKg, pricePerKg: row.isPooled && row.pooledPricePerKg ? row.pooledPricePerKg : row.listing.pricePerKg })))
  const totalSavings = rows.reduce((sum, row) => sum + (row.isPooled && row.savingsPerKg ? row.savingsPerKg * row.quantityKg : 0), 0)

  const update = (listingId: string, quantityKg: number) => {
    const listing = listings?.find((item) => item.id === listingId)
    const next = cart.map((item) => item.listingId === listingId ? { ...item, quantityKg: Math.max(1, Math.min(quantityKg, listing?.remainingKg ?? quantityKg)) } : item)
    setCart(phase2Service.saveCart(next))
  }
  const remove = (listingId: string) => setCart(phase2Service.saveCart(cart.filter((item) => item.listingId !== listingId)))

  if (loading) return <DashboardSkeleton />

  return (
    <div className="page">
      <PageHead eyebrow="Your basket" title="Cart" copy="Quantities are reserved only when you place the mock order." />
      {!rows.length ? (
        <EmptyState icon={ShoppingCart} title="Your cart is empty" copy="Fresh produce from nearby farms is waiting for you." actionLabel="Explore produce" actionTo="/consumer/explore" />
      ) : (
        <div className="commerce-grid">
          <section className="stack-list">
            {totalSavings > 0 && (
              <div style={{ background: '#064e3b', color: '#6ee7b7', padding: '0.85rem 1.15rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={18} /> 🚛 NCR Pool Savings Active
                </span>
                <strong>Total Saved: ₹{totalSavings.toFixed(2)}</strong>
              </div>
            )}
            {rows.map(({ listing, quantityKg, isPooled, pooledPricePerKg, regularPricePerKg, savingsPerKg }) => {
              const effectivePrice = isPooled && pooledPricePerKg ? pooledPricePerKg : listing.pricePerKg
              const originalPrice = isPooled && regularPricePerKg ? regularPricePerKg : listing.pricePerKg
              const lineTotal = quantityKg * effectivePrice
              const lineSavings = isPooled && savingsPerKg ? savingsPerKg * quantityKg : 0

              return (
                <article className={`line-card ${quantityKg > listing.remainingKg ? 'invalid' : ''}`} key={listing.id}>
                  <ProductImage imageSrc={listing.imageSrc} alt={listing.crop} visual={listing.visual} size="mini" />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h2>{listing.crop}</h2>
                      {isPooled && <StatusBadge tone="green">NCR Group Buy</StatusBadge>}
                    </div>
                    <p>
                      {listing.farm} · {isPooled ? (
                        <>
                          <span style={{ textDecoration: 'line-through', opacity: 0.6, marginRight: '0.35rem' }}>{money(originalPrice)}/kg</span>
                          <strong style={{ color: '#059669' }}>{money(effectivePrice)}/kg</strong>
                        </>
                      ) : (
                        <>{money(listing.pricePerKg)}/kg</>
                      )}
                    </p>
                    {isPooled && lineSavings > 0 && (
                      <small style={{ color: '#059669', fontWeight: 600, display: 'block', marginTop: '0.2rem' }}>
                        Save ₹{savingsPerKg?.toFixed(2)}/kg · Total item savings: ₹{lineSavings.toFixed(2)}
                      </small>
                    )}
                    <div className="qty-stepper" style={{ marginTop: '0.5rem' }}>
                      <button onClick={() => update(listing.id, quantityKg - 1)}><Minus size={15} /></button>
                      <strong>{quantityKg} kg</strong>
                      <button onClick={() => update(listing.id, quantityKg + 1)} disabled={quantityKg >= listing.remainingKg}><Plus size={15} /></button>
                    </div>
                    {listing.remainingKg < 20 && <small className="warning-copy">Only {listing.remainingKg} kg available</small>}
                  </div>
                  <div className="line-total">
                    <strong>{money(lineTotal)}</strong>
                    <button aria-label="Remove item" onClick={() => remove(listing.id)}><Trash2 size={17} /></button>
                  </div>
                </article>
              )
            })}
            <button className="btn btn-ghost" onClick={() => setCart(phase2Service.clearCart())}><Trash2 size={16} /> Clear cart</button>
            <div className="gentle-banner"><Truck size={24} /><div><strong>Pooled farm pickup</strong><p>If items come from multiple farms, KisanLink combines nearby pickups into one last-mile delivery for this prototype.</p></div></div>
            <div className="basket-intelligence">
              <MarketplaceAiTrigger variant="inline" idleLabel="Check basket" idleHint="Is this basket already efficient?" stages={['Checking cart items', 'Reviewing farm origins', 'Applying prototype logistics', 'Checking item stock', 'Preparing basket advice']} run={() => basketOptimizer(cart, listings ?? [])} renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} onClose={reset} onCta={() => insight.ctaLabel === 'View nearby produce' ? navigate('/consumer/explore') : reset()} footer="Logistics values are estimates from the current prototype logistics formula, not route quotes." />} />
            </div>
          </section>
          <PriceSummary {...costs} action={<Link className="btn btn-primary btn-full btn-large" to="/consumer/checkout">Proceed to checkout <ArrowRight size={17} /></Link>} />
        </div>
      )}
    </div>
  )
}

export function ConsumerCheckoutPage() {
  const navigate = useNavigate(); const { showToast } = useToast(); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(''); const [slot, setSlot] = useState('Tomorrow · 8–11 AM'); const [payment, setPayment] = useState<'UPI' | 'Card' | 'Pay on Delivery'>('UPI'); const [note, setNote] = useState(''); const [addressId, setAddressId] = useState(''); const [adding, setAdding] = useState(false)
  const { data, loading } = useAsyncData(async () => ({ listings: await phase2Service.listings(), profile: await phase2Service.consumerProfile() })); const cart = phase2Service.cart(); const rows = availableForCart(cart, data?.listings ?? []); const costs = orderCosts(rows.map((row) => ({ quantityKg: row.quantityKg, pricePerKg: row.listing.pricePerKg }))); const addresses = data?.profile.addresses ?? []; const selected = addresses.find((item) => item.id === addressId) ?? addresses.find((item) => item.isDefault)
  useEffect(() => { if (data) setAddressId(data.profile.addresses.find((item) => item.isDefault)?.id ?? data.profile.addresses[0]?.id ?? '') }, [data])
  if (loading) return <DashboardSkeleton />
  if (!rows.length) return <EmptyState icon={ShoppingCart} title="Nothing to checkout" copy="Add available produce to your cart first." actionLabel="Browse produce" actionTo="/consumer/explore" />
  const place = async () => { if (!selected) { setError('Choose or add a delivery address.'); return } setSubmitting(true); setError(''); try { const order = await phase2Service.placeConsumerOrder({ items: cart, address: selected, deliverySlot: slot, note, paymentMethod: payment }); showToast(`Order ${order.id} placed successfully`); navigate(`/consumer/orders/${order.id}`, { replace: true }) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to place order.') } finally { setSubmitting(false) } }
  return <div className="page"><Link className="back-link" to="/consumer/cart"><ArrowLeft size={16} /> Back to cart</Link><PageHead eyebrow="Mock checkout" title="Delivery & payment" copy="No real payment details are collected." /><div className="commerce-grid"><section className="checkout-stack"><section className="feature-card"><div className="card-heading"><div><span className="eyebrow">1 · Address</span><h2>Where should we deliver?</h2></div><button className="btn btn-secondary" onClick={() => setAdding(!adding)}><Plus size={16} /> Add address</button></div><div className="choice-grid">{addresses.map((address) => <button key={address.id} className={`choice-card ${selected?.id === address.id ? 'selected' : ''}`} onClick={() => setAddressId(address.id)}><Home size={20} /><strong>{address.label}{address.isDefault ? ' · Default' : ''}</strong><span>{address.line1}, {address.city} · {address.pincode}</span>{selected?.id === address.id && <Check size={17} />}</button>)}</div>{adding && <AddressForm profile={data!.profile} onSaved={(profile) => { setAddressId(profile.addresses.at(-1)!.id); setAdding(false) }} />}</section><section className="feature-card"><span className="eyebrow">2 · Delivery</span><h2>Choose a delivery slot</h2><div className="choice-grid compact">{['Tomorrow · 8–11 AM', 'Tomorrow · 2–5 PM', 'Day after · 8–11 AM'].map((value) => <button className={`choice-card ${slot === value ? 'selected' : ''}`} key={value} onClick={() => setSlot(value)}><Clock3 size={19} /><strong>{value}</strong><span>Estimated farm-to-door: 30–42 hours</span></button>)}</div><label className="field"><span>Order note</span><textarea value={note} maxLength={180} onChange={(event) => setNote(event.target.value)} placeholder="Ripeness or delivery instructions (optional)" /></label></section><section className="feature-card"><span className="eyebrow">3 · Mock payment</span><h2>Select a method</h2><div className="choice-grid compact">{(['UPI', 'Card', 'Pay on Delivery'] as const).map((value) => <button className={`choice-card ${payment === value ? 'selected' : ''}`} key={value} onClick={() => setPayment(value)}><ShieldCheck size={19} /><strong>{value}</strong><span>Prototype selection only</span></button>)}</div></section></section><PriceSummary {...costs} action={<><p className="safe-note"><ShieldCheck size={16} /> Mock payment only. No account or card data is requested.</p>{error && <p className="form-error centered">{error}</p>}<button className="btn btn-primary btn-full btn-large" disabled={submitting} onClick={place}>{submitting ? 'Creating connected order…' : `Place mock order · ${money(costs.total)}`}</button></>} /></div></div>
}

function AddressForm({ profile, onSaved }: { profile: ConsumerProfileData; onSaved: (profile: ConsumerProfileData) => void }) {
  const [form, setForm] = useState({ label: 'Work', line1: '', city: 'New Delhi', pincode: '' }); const [error, setError] = useState('')
  const save = async (event: FormEvent) => { event.preventDefault(); if (!form.line1.trim() || !/^\d{6}$/.test(form.pincode)) { setError('Enter an address and valid 6-digit pincode.'); return } const address: Address = { id: `addr_${Date.now()}`, label: form.label, recipient: profile.name, phone: profile.phone, line1: form.line1, city: form.city, pincode: form.pincode, isDefault: profile.addresses.length === 0 }; const updated = { ...profile, addresses: [...profile.addresses, address] }; await phase2Service.saveConsumerProfile(updated); onSaved(updated) }
  return <form className="inline-form form-grid" onSubmit={save}><label className="field"><span>Label</span><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label><label className="field"><span>Address</span><input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} /></label><label className="field"><span>City</span><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label><label className="field"><span>Pincode</span><input inputMode="numeric" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="btn btn-primary" type="submit">Save address</button></form>
}

export function ConsumerOrdersPage() {
  const [filter, setFilter] = useState<'active' | 'delivered' | 'cancelled'>('active'); const { data, loading, error } = useAsyncData(() => phase2Service.consumerOrders())
  const orders = data?.filter((order) => filter === 'active' ? !['delivered', 'cancelled'].includes(order.status) : order.status === filter) ?? []
  if (loading) return <DashboardSkeleton />
  return <div className="page"><PageHead eyebrow="Farm to door" title="Your orders" copy="Follow every deterministic prototype milestone." /><FilterTabs values={['active', 'delivered', 'cancelled']} active={filter} onChange={(value) => setFilter(value as typeof filter)} />{error ? <ErrorState /> : orders.length ? <div className="stack-list">{orders.map((order) => <Link className="order-card" key={order.id} to={`/consumer/orders/${order.id}`}><div><span className="eyebrow">{order.id} · <span style={{ color: order.isBackendSynced ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{order.modeLabel || (order.isBackendSynced ? 'Live Backend Order' : 'Demo / Prototype Mode')}</span></span><h2>{order.items.map((item) => item.crop).join(', ')}</h2><p>{order.items.reduce((sum, item) => sum + item.quantityKg, 0)} kg · {order.items.map((item) => item.farm).join(', ')}</p><small>{prettyDate(order.orderedAt)} · ETA {prettyDate(order.eta)}</small></div><div><StatusBadge tone={order.status === 'cancelled' ? 'red' : order.status === 'delivered' ? 'green' : 'amber'}>{statusLabel[order.status]}</StatusBadge><strong>{money(order.total)}</strong><small>{order.paymentStatus}</small><ChevronRight size={18} /></div></Link>)}</div> : <EmptyState icon={PackageCheck} title={`No ${filter} orders`} copy="Your matching orders will appear here." actionLabel="Explore produce" actionTo="/consumer/explore" />}</div>
}

export function ConsumerOrderDetailPage() {
  const { id = '' } = useParams(); const { data, loading, error } = useAsyncData(() => phase2Service.consumerOrder(id), [id]); if (loading) return <DashboardSkeleton />; if (!data || error) return <ErrorState title="Order not found" />
  const current = tracking.indexOf(data.status)
  return <div className="page"><Link className="back-link" to="/consumer/orders"><ArrowLeft size={16} /> All orders</Link><PageHead eyebrow={`${data.id} · ${data.modeLabel || (data.isBackendSynced ? 'Live Backend Order' : 'Demo / Prototype Mode')}`} title="Order tracking" copy={`Ordered ${prettyDate(data.orderedAt)} · ${data.paymentStatus}`} /><div className="detail-grid"><section className="feature-card"><div className="card-heading"><div><span className="eyebrow">Current status</span><h2>{statusLabel[data.status]}</h2></div><StatusBadge tone="green">ETA {prettyDate(data.eta)}</StatusBadge></div><div className="tracking-line">{tracking.map((status, index) => <div className={index <= current ? 'done' : ''} key={status}><span>{index < current ? <Check size={15} /> : index + 1}</span><strong>{statusLabel[status]}</strong><small>{index === 0 ? prettyDate(data.orderedAt) : index <= current ? 'Prototype timestamp' : 'Upcoming'}</small></div>)}</div><div className="freshness-card"><span className="eyebrow">Freshness journey · Kisan Intelligence</span><h2>{statusLabel[data.status]} · ETA {prettyDate(data.eta)}</h2><p>Farm-to-door timing is an estimate from the active order timeline and delivery slot.</p><div>{['Order confirmed', 'Pickup scheduled', 'In transit', 'Delivered'].map((step, index) => <span className={index <= Math.min(3, Math.floor(current / 2)) ? 'done' : ''} key={step}><Sprout size={18} /><strong>{step}</strong><small>{index === 0 ? prettyDate(data.orderedAt) : index <= Math.min(3, Math.floor(current / 2)) ? 'Current prototype milestone' : 'Upcoming milestone'}</small></span>)}</div></div></section><aside className="summary-card"><h2>Order summary</h2>{data.items.map((item) => <div className="summary-product" key={item.listingId}><ProductImage imageSrc={item.imageSrc} visual="green" alt={item.crop} size="mini" /><span><strong>{item.crop}</strong><small>{item.quantityKg} kg · {item.farm}</small></span><b>{money(item.quantityKg * item.ratePerKg)}</b></div>)}<PriceRows subtotal={data.subtotal} logistics={data.logisticsFee} platform={data.platformFee} farmerShare={data.farmerShare} total={data.total} /><div className="address-box"><MapPin size={19} /><div><strong>{data.address.label}</strong><p>{data.address.line1}, {data.address.city} · {data.address.pincode}</p><small>{data.deliverySlot}</small></div></div><a className="btn btn-secondary btn-full" href="tel:18001234567">Contact support · 1800 123 4567</a></aside></div></div>
}

export function ConsumerSavedPage() {
  const [version, setVersion] = useState(0); const { data, loading } = useAsyncData(async () => ({ saved: await phase2Service.saved(), listings: await phase2Service.listings() }), [version]); if (loading) return <DashboardSkeleton />; const savedListings = data!.listings.filter((item) => data!.saved.listingIds.includes(item.id))
  return <div className="page"><PageHead eyebrow="Favourites" title="Saved produce & farms" copy="Keep trusted produce and growers close." /><section className="section-block"><div className="section-heading"><h2>Saved produce</h2></div>{savedListings.length ? <div className="product-grid product-grid-wide">{savedListings.map((item) => <ConsumerListingCard key={item.id} listing={item} />)}</div> : <EmptyState icon={Heart} title="No saved produce" copy="Tap the heart on a listing to save it." actionLabel="Browse produce" actionTo="/consumer/explore" />}</section><section className="section-block"><div className="section-heading"><h2>Saved farms</h2></div>{data!.saved.farmNames.length ? <div className="stack-list">{data!.saved.farmNames.map((farm) => <article className="line-card" key={farm}><span className="round-icon"><Sprout size={20} /></span><div><h2>{farm}</h2><p>Verified farm · Sonipat, Haryana</p></div><button className="btn btn-secondary" onClick={async () => { await phase2Service.toggleSavedFarm(farm); setVersion((value) => value + 1) }}><Trash2 size={15} /> Remove</button></article>)}</div> : <p className="muted-copy">No saved farms yet.</p>}</section></div>
}

export function ConsumerHowItWorksPage() {
  const steps = [[Sprout, 'Farmer lists', 'Harvest, quantity and a fair direct price are shared.'], [UserRound, 'KisanLink matches demand', 'Nearby consumer and bulk demand is matched.'], [Truck, 'Pickups are pooled', 'Compatible farm pickups share a route.'], [Home, 'Produce is delivered', 'Transparent tracking continues to your door.'], [ShieldCheck, 'Farmer retains more value', 'Every order shows the farmer share.'], [ShoppingCart, 'Buyer sees fair pricing', 'Produce, platform and logistics are separated.']] as const
  return <div className="page"><PageHead eyebrow="One connected ecosystem" title="How KisanLink works" copy="A shorter, more transparent journey from field to buyer." /><div className="how-flow">{steps.map(([Icon, title, copy], index) => <article key={title}><span>{index + 1}</span><Icon size={25} /><h2>{title}</h2><p>{copy}</p>{index < steps.length - 1 && <ArrowRight size={20} />}</article>)}</div></div>
}

export function ConsumerProfilePage() { return <ProfilePage /> }

function PageHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <div className="page-title-row"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div></div> }
function FilterTabs({ values, active, onChange }: { values: string[]; active: string; onChange: (value: string) => void }) { return <div className="filter-tabs">{values.map((value) => <button className={active === value ? 'active' : ''} key={value} onClick={() => onChange(value)}>{value.replaceAll('_', ' ')}</button>)}</div> }
function PriceRows({ subtotal, logistics, platform, farmerShare, total }: { subtotal: number; logistics: number; platform: number; farmerShare: number; total: number }) { return <div className="price-rows"><span>Produce subtotal <b>{money(subtotal)}</b></span><span>Logistics <b>{money(logistics)}</b></span><span>Platform amount <b>{money(platform)}</b></span><span className="farmer-row">Farmer share <b>{money(farmerShare)}</b></span><strong>Grand total <b>{money(total)}</b></strong></div> }
function PriceSummary(props: { subtotal: number; logistics: number; platform: number; farmerShare: number; total: number; action: React.ReactNode }) { return <aside className="summary-card sticky"><h2>Transparent total</h2><PriceRows {...props} />{props.action}</aside> }
function ErrorState({ title = 'Unable to load this page' }: { title?: string }) { return <div className="error-panel"><RefreshCw size={25} /><h2>{title}</h2><p>Please retry. Your saved prototype data has not been changed.</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button></div> }
