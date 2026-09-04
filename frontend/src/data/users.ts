import type { User } from '../types'

export const demoUsers: Record<string, User> = {
  farmer_001: {
    id: 'farmer_001', role: 'farmer', name: 'Ramesh Kumar', phone: '9876543210',
    location: 'Sonipat, Haryana', avatarInitials: 'RK', farmName: 'Ramesh Farms',
  },
  consumer_001: {
    id: 'consumer_001', role: 'consumer', name: 'Aarav Mehta', phone: '9811122233',
    location: 'Dwarka, New Delhi', avatarInitials: 'AM',
  },
  bulk_001: {
    id: 'bulk_001', role: 'bulk', name: 'FreshKart Procurement', phone: '9899001122',
    location: 'Delhi NCR', avatarInitials: 'FP', company: 'FreshKart Foods Pvt. Ltd.',
    representative: 'Neha Kapoor', gst: 'GST verification pending',
  },
  logistics_001: {
    id: 'logistics_001', role: 'logistics', name: 'Kavita Logistics', phone: '9877004455',
    location: 'KisanLink Sonipat Hub', avatarInitials: 'KL',
  },
}

export const demoUserIdByRole = {
  farmer: 'farmer_001',
  consumer: 'consumer_001',
  bulk: 'bulk_001',
  logistics: 'logistics_001',
} as const
