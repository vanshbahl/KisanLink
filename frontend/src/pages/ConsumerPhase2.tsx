import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Heart, Home, MapPin, Minus, PackageCheck, Plus, RefreshCw, ShieldCheck, ShoppingCart, Sprout, Trash2, Truck } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MarketplaceAiTrigger } from '../components/ai/MarketplaceAiTrigger'
import { MarketplaceInsightResult } from '../components/ai/MarketplaceInsightResult'
import { ConsumerListingCard } from '../components/consumer/ConsumerListingCard'
import { EmptyState } from '../components/EmptyState'
import { DashboardSkeleton } from '../components/LoadingSkeleton'
import { ProductImage } from '../components/ProductImage'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../contexts/ToastContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { basketOptimizer } from '../services/consumerIntelligenceService'
import { availableForCart, consumerCartCosts, phase2Service } from '../services/phase2Service'
import type { Address, CartItem, ConsumerOrderStatus, ConsumerProfileData } from '../types'
import { ProfilePage } from './ProfilePage'

const statusLabel: Record<ConsumerOrderStatus, string> = { confirmed: 'Confirmed', farmer_preparing: 'Farmer preparing', pickup_scheduled: 'Pickup scheduled', collected: 'Collected', in_transit: 'In transit', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' }
const tracking: ConsumerOrderStatus[] = ['confirmed', 'farmer_preparing', 'pickup_scheduled', 'collected', 'in_transit', 'out_for_delivery', 'delivered']
const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`
const prettyDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export function ConsumerCartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>(phase2Service.cart())
  const { data: listings, loading } = useAsyncData(() => phase2Service.listings())
  const rows = availableForCart(cart, listings ?? [])
  const costs = consumerCartCosts(rows)

  const update = (listingId: string, quantityKg: number) => {
    const listing = listings?.find((item) => item.id === listingId)
    const next = cart.map((item) => item.listingId === listingId ? { ...item, quantityKg: Math.max(1, Math.min(quantityKg, listing?.remainingKg ?? quantityKg)) } : item)
    setCart(phase2Service.saveCart(next))
  }
  const remove = (listingId: string) => setCart(phase2Service.saveCart(cart.filter((item) => item.listingId !== listingId)))

  if (loading) return <DashboardSkeleton />
  return (
    <div className="page consumer-commerce-page">
      <PageHead eyebrow="Your basket" title="Cart" copy={`${rows.length} ${rows.length === 1 ? 'item' : 'items'} ready for checkout`} />
      {!rows.length ? <EmptyState icon={ShoppingCart} title="Your cart is empty" copy="Fresh produce from nearby farms is waiting for you." actionLabel="Browse produce" actionTo="/consumer#marketplace" /> : (
        <div className="consumer-commerce-grid">
          <section className="consumer-cart-list">
            {rows.map((row) => {
              const rate = row.isPooled ? row.pooledPricePerKg ?? row.listing.pricePerKg : row.listing.pricePerKg
              return <article className={`consumer-cart-row ${row.quantityKg > row.listing.remainingKg ? 'invalid' : ''}`} key={row.listing.id}>
                <ProductImage imageSrc={row.listing.imageSrc} alt={row.listing.crop} visual={row.listing.visual} size="mini" />
                <div className="consumer-cart-copy"><span>{row.isPooled ? 'Market Maker price' : 'Farm fresh'}</span><h2>{row.listing.crop}</h2><p>{row.listing.farm}</p>{row.isPooled && <small><s>{money(row.regularPricePerKg ?? row.listing.retailPricePerKg)}/kg</s> Save {money(row.savingsPerKg ?? 0)}/kg</small>}<div className="qty-stepper"><button onClick={() => update(row.listing.id, row.quantityKg - 1)} disabled={row.quantityKg <= 1} aria-label="Decrease quantity"><Minus size={15} /></button><strong>{row.quantityKg} kg</strong><button onClick={() => update(row.listing.id, row.quantityKg + 1)} disabled={row.quantityKg >= row.listing.remainingKg} aria-label="Increase quantity"><Plus size={15} /></button></div>{row.listing.remainingKg < 20 && <small className="warning-copy">Only {row.listing.remainingKg} kg available</small>}</div>
                <div className="consumer-cart-total"><strong>{money(row.quantityKg * rate)}</strong><small>{money(rate)}/kg</small><button aria-label="Remove item" onClick={() => remove(row.listing.id)}><Trash2 size={17} /></button></div>
              </article>
            })}
            <div className="consumer-cart-tools"><button className="btn btn-ghost" onClick={() => setCart(phase2Service.clearCart())}><Trash2 size={16} />Clear cart</button><MarketplaceAiTrigger variant="inline" className="consumer-ai-compact" idleLabel="Check my basket" idleHint="Check value, stock and pickup efficiency" stages={['Checking cart items', 'Reviewing farm origins', 'Applying prototype logistics', 'Checking item stock', 'Preparing basket advice']} run={() => basketOptimizer(cart, listings ?? [])} renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} onClose={reset} onCta={() => insight.ctaLabel === 'View nearby produce' ? navigate('/consumer#marketplace') : reset()} footer="Logistics values are estimates from the current prototype formula, not route quotes." />} /></div>
          </section>
          <PriceSummary {...costs} action={<Link className="btn btn-primary btn-full btn-large" to="/consumer/checkout">Proceed to checkout <ArrowRight size={17} /></Link>} />
        </div>
      )}
    </div>
  )
}

export function ConsumerCheckoutPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [slot, setSlot] = useState('Tomorrow · 8–11 AM')
  const [payment, setPayment] = useState<'UPI' | 'Card' | 'Pay on Delivery'>('UPI')
  const [note, setNote] = useState('')
  const [addressId, setAddressId] = useState('')
  const [adding, setAdding] = useState(false)
  const [changingAddress, setChangingAddress] = useState(false)
  const { data, loading } = useAsyncData(async () => ({ listings: await phase2Service.listings(), profile: await phase2Service.consumerProfile() }))
  const cart = phase2Service.cart()
  const rows = availableForCart(cart, data?.listings ?? [])
  const costs = consumerCartCosts(rows)
  const addresses = data?.profile.addresses ?? []
  const selected = addresses.find((item) => item.id === addressId) ?? addresses.find((item) => item.isDefault)

  useEffect(() => { if (data) setAddressId(data.profile.addresses.find((item) => item.isDefault)?.id ?? data.profile.addresses[0]?.id ?? '') }, [data])
  if (loading) return <DashboardSkeleton />
  if (!rows.length) return <EmptyState icon={ShoppingCart} title="Nothing to checkout" copy="Add available produce to your cart first." actionLabel="Browse produce" actionTo="/consumer#marketplace" />

  const place = async () => {
    if (!selected) { setError('Choose or add a delivery address.'); return }
    setSubmitting(true); setError('')
    try {
      const order = await phase2Service.placeConsumerOrder({ items: cart, address: selected, deliverySlot: slot, note, paymentMethod: payment })
      showToast(`Order ${order.id} placed successfully`)
      navigate(`/consumer/orders/${order.id}`, { replace: true })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to place order.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="page consumer-commerce-page">
      <Link className="back-link" to="/consumer/cart"><ArrowLeft size={16} />Back to cart</Link>
      <PageHead eyebrow="Checkout" title="Delivery and payment" copy="Review the essentials, then place your order." />
      <div className="consumer-commerce-grid">
        <section className="consumer-checkout-stack">
          <section className="consumer-checkout-section">
            <div className="consumer-checkout-heading"><h2>Delivery address</h2><div><button onClick={() => setChangingAddress((value) => !value)}>Change</button><button onClick={() => setAdding((value) => !value)}><Plus size={14} />Add</button></div></div>
            {selected && <div className="consumer-address-row"><Home size={18} /><span><strong>{selected.label}</strong><small>{selected.line1}, {selected.city} · {selected.pincode}</small></span><Check size={17} /></div>}
            {changingAddress && <div className="consumer-address-options">{addresses.map((address) => <button className={selected?.id === address.id ? 'selected' : ''} key={address.id} onClick={() => { setAddressId(address.id); setChangingAddress(false) }}><strong>{address.label}</strong><span>{address.line1}, {address.city}</span></button>)}</div>}
            {adding && <AddressForm profile={data!.profile} onSaved={(profile) => { setAddressId(profile.addresses.at(-1)!.id); setAdding(false) }} />}
          </section>

          <section className="consumer-checkout-section"><h2>Delivery slot</h2><div className="consumer-slot-options">{['Tomorrow · 8–11 AM', 'Tomorrow · 2–5 PM', 'Day after · 8–11 AM'].map((value) => <button className={slot === value ? 'selected' : ''} key={value} onClick={() => setSlot(value)}><Clock3 size={17} /><span><strong>{value}</strong><small>Estimated journey: 30 to 42 hours</small></span></button>)}</div></section>

          <section className="consumer-checkout-section"><h2>Payment</h2><div className="consumer-payment-options">{(['UPI', 'Card', 'Pay on Delivery'] as const).map((value) => <label className={payment === value ? 'selected' : ''} key={value}><input type="radio" name="payment" checked={payment === value} onChange={() => setPayment(value)} /><span>{value}</span></label>)}</div></section>

          <label className="field consumer-order-note"><span>Delivery instructions <small>optional</small></span><textarea value={note} maxLength={180} onChange={(event) => setNote(event.target.value)} placeholder="Ripeness or drop-off instructions" /></label>
          <p className="consumer-prototype-note"><ShieldCheck size={15} />Prototype checkout only. No account or card details are collected.</p>
        </section>
        <PriceSummary {...costs} action={<>{error && <p className="form-error centered">{error}</p>}<button className="btn btn-primary btn-full btn-large" disabled={submitting} onClick={place}>{submitting ? 'Creating connected order...' : `Place order · ${money(costs.total)}`}</button></>} />
      </div>
    </div>
  )
}

function AddressForm({ profile, onSaved }: { profile: ConsumerProfileData; onSaved: (profile: ConsumerProfileData) => void }) {
  const [form, setForm] = useState({ label: 'Work', line1: '', city: 'New Delhi', pincode: '' })
  const [error, setError] = useState('')
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.line1.trim() || !/^\d{6}$/.test(form.pincode)) { setError('Enter an address and valid 6-digit pincode.'); return }
    const address: Address = { id: `addr_${Date.now()}`, label: form.label, recipient: profile.name, phone: profile.phone, line1: form.line1, city: form.city, pincode: form.pincode, isDefault: profile.addresses.length === 0 }
    const updated = { ...profile, addresses: [...profile.addresses, address] }
    await phase2Service.saveConsumerProfile(updated)
    onSaved(updated)
  }
  return <form className="consumer-address-form" onSubmit={save}><label className="field"><span>Label</span><input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></label><label className="field"><span>Address</span><input type="text" autoComplete="address-line1" value={form.line1} onChange={(event) => setForm({ ...form, line1: event.target.value })} /></label><label className="field"><span>City</span><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label><label className="field"><span>Pincode</span><input type="tel" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={form.pincode} onChange={(event) => setForm({ ...form, pincode: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="btn btn-primary" type="submit">Save address</button></form>
}

export function ConsumerOrdersPage() {
  const [filter, setFilter] = useState<'active' | 'delivered' | 'cancelled'>('active')
  const { data, loading, error } = useAsyncData(() => phase2Service.consumerOrders(), [], { live: true })
  const orders = data?.filter((order) => filter === 'active' ? !['delivered', 'cancelled'].includes(order.status) : order.status === filter) ?? []
  if (loading) return <DashboardSkeleton />
  return <div className="page consumer-orders-page"><PageHead eyebrow="Orders" title="Your orders" copy="Track active deliveries or revisit past orders." /><FilterTabs values={['active', 'delivered', 'cancelled']} active={filter} onChange={(value) => setFilter(value as typeof filter)} />{error ? <ErrorState /> : orders.length ? <div className="consumer-order-list">{orders.map((order) => <Link className="consumer-order-card" key={order.id} to={`/consumer/orders/${order.id}`}><div className="consumer-order-status"><StatusBadge tone={order.status === 'cancelled' ? 'red' : order.status === 'delivered' ? 'green' : 'amber'}>{statusLabel[order.status]}</StatusBadge><small>{order.id}</small></div><div className="consumer-order-main"><h2>{order.items.map((item) => item.crop).join(', ')}</h2><p>{order.items.reduce((sum, item) => sum + item.quantityKg, 0)} kg · {money(order.total)}</p></div><div className="consumer-order-eta"><span>ETA</span><strong>{prettyDate(order.eta)}</strong></div><span className="consumer-order-link">View tracking <ChevronRight size={17} /></span></Link>)}</div> : <EmptyState icon={PackageCheck} title={`No ${filter} orders`} copy="Matching orders will appear here." actionLabel="Browse produce" actionTo="/consumer#marketplace" />}</div>
}

export function ConsumerOrderDetailPage() {
  const { id = '' } = useParams()
  const { data, loading, error } = useAsyncData(() => phase2Service.consumerOrder(id), [id], { live: true })
  if (loading) return <DashboardSkeleton />
  if (!data || error) return <ErrorState title="Order not found" />
  const current = tracking.indexOf(data.status)
  return (
    <div className="page consumer-order-detail-page">
      <Link className="back-link" to="/consumer/orders"><ArrowLeft size={16} />All orders</Link>
      <div className="consumer-tracking-head"><div><span>{data.id}</span><h1>{statusLabel[data.status]}</h1><p>Ordered {prettyDate(data.orderedAt)} · {data.paymentStatus}</p></div><strong>ETA {prettyDate(data.eta)}</strong></div>
      <div className="consumer-order-detail-grid">
        <section className="consumer-tracking-card">
          <div className="consumer-tracking-line">{tracking.map((status, index) => { const item = data.timeline.find((entry) => entry.status === status); return <div className={index <= current ? 'done' : ''} key={status}><span>{index <= current ? <Check size={14} /> : index + 1}</span><div><strong>{statusLabel[status]}</strong><small>{item ? prettyDate(item.at) : index <= current ? 'Status updated' : 'Upcoming'}</small></div></div> })}</div>
          <p className="consumer-freshness-metric"><Sprout size={17} /><span><strong>Estimated harvest to delivery: about 31 hours</strong><small>Based on the active delivery slot and order timeline.</small></span></p>
        </section>
        <aside className="summary-card consumer-order-summary"><h2>Order summary</h2>{data.items.map((item) => <div className="summary-product" key={item.listingId}><ProductImage imageSrc={item.imageSrc} visual="green" alt={item.crop} size="mini" /><span><strong>{item.crop}</strong><small>{item.quantityKg} kg · {item.farm}</small></span><b>{money(item.quantityKg * item.ratePerKg)}</b></div>)}<PriceRows subtotal={data.subtotal} logistics={data.logisticsFee} platform={data.platformFee} farmerShare={data.farmerShare} total={data.total} /><details><summary><MapPin size={17} />Delivery address <ChevronRight size={15} /></summary><div className="address-box"><div><strong>{data.address.label}</strong><p>{data.address.line1}, {data.address.city} · {data.address.pincode}</p><small>{data.deliverySlot}</small></div></div></details><a className="btn btn-secondary btn-full" href="tel:18001234567">Contact support · 1800 123 4567</a></aside>
      </div>
    </div>
  )
}

export function ConsumerSavedPage() {
  const [version, setVersion] = useState(0)
  const { data, loading } = useAsyncData(async () => ({ saved: await phase2Service.saved(), listings: await phase2Service.listings() }), [version])
  if (loading) return <DashboardSkeleton />
  const savedListings = data!.listings.filter((item) => data!.saved.listingIds.includes(item.id))
  return <div className="page consumer-saved-page"><PageHead eyebrow="Saved" title="Produce and farms" copy="Keep trusted produce and growers close." /><section><div className="consumer-market-heading"><h2>Saved produce</h2></div>{savedListings.length ? <div className="consumer-product-grid">{savedListings.map((item) => <ConsumerListingCard key={item.id} listing={item} />)}</div> : <EmptyState icon={Heart} title="No saved produce" copy="Tap the heart on a listing to save it." actionLabel="Browse produce" actionTo="/consumer#marketplace" />}</section><section className="consumer-saved-farms"><h2>Saved farms</h2>{data!.saved.farmNames.length ? data!.saved.farmNames.map((farm) => <article key={farm}><span><Sprout size={18} /></span><div><strong>{farm}</strong><small>Verified farm · Sonipat, Haryana</small></div><button onClick={async () => { await phase2Service.toggleSavedFarm(farm); setVersion((value) => value + 1) }}><Trash2 size={16} />Remove</button></article>) : <p>No saved farms yet.</p>}</section></div>
}

export function ConsumerHowItWorksPage() {
  const steps = [[Sprout, 'Farm', 'Farmers share fresh harvest, available quantity and a fair direct price.'], [Truck, 'Pooled pickup', 'Nearby orders share a fuller route with fewer intermediary costs.'], [Home, 'Your door', 'You receive tracked produce with a clear price and farmer share.']] as const
  return <div className="page consumer-how-page"><PageHead eyebrow="Why KisanLink" title="A shorter route to fresh produce" copy="Farmers earn more of the price while buyers pay less than local retail." /><div className="consumer-how-flow">{steps.map(([Icon, title, copy], index) => <article key={title}><span>{index + 1}</span><Icon size={25} /><h2>{title}</h2><p>{copy}</p>{index < steps.length - 1 && <ArrowRight size={20} />}</article>)}</div><Link className="btn btn-primary" to="/consumer#marketplace">Browse fresh produce</Link></div>
}

export function ConsumerProfilePage() { return <ProfilePage /> }

function PageHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <div className="page-title-row consumer-page-head"><div><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div></div> }
function FilterTabs({ values, active, onChange }: { values: string[]; active: string; onChange: (value: string) => void }) { return <div className="filter-tabs consumer-filter-tabs">{values.map((value) => <button className={active === value ? 'active' : ''} key={value} onClick={() => onChange(value)}>{value.replaceAll('_', ' ')}</button>)}</div> }
function PriceRows({ subtotal, logistics, platform, farmerShare, total }: { subtotal: number; logistics: number; platform: number; farmerShare: number; total: number }) { return <div className="price-rows"><span>Produce subtotal <b>{money(subtotal)}</b></span><span>Logistics <b>{money(logistics)}</b></span><span>Platform fee <b>{money(platform)}</b></span><span className="farmer-row">Farmer share <b>{money(farmerShare)}</b></span><strong>Total <b>{money(total)}</b></strong></div> }
function PriceSummary(props: { subtotal: number; logistics: number; platform: number; farmerShare: number; total: number; action: React.ReactNode }) { return <aside className="summary-card sticky consumer-price-summary"><h2>Price summary</h2><PriceRows {...props} />{props.action}</aside> }
function ErrorState({ title = 'Unable to load this page' }: { title?: string }) { return <div className="error-panel"><RefreshCw size={25} /><h2>{title}</h2><p>Retry to refresh this page. Your saved data has not changed.</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button></div> }
