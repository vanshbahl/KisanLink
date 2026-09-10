import type { Farmer } from '../types'

/**
 * The growers behind every listing in the prototype. Locations match `data/geo.ts`, so a
 * farmer named here can always be plotted on the corridor map.
 */
export const farmers: Farmer[] = [
  { id: 'farmer_001', name: 'Ramesh Kumar', farmName: 'Green Field Farm', location: 'Murthal, Sonipat', verified: true, yearsFarming: 18 },
  { id: 'farmer_002', name: 'Harpreet Singh', farmName: 'Sunehri Khet', location: 'Karnal, Haryana', verified: true, yearsFarming: 14 },
  { id: 'farmer_003', name: 'Rajesh Yadav', farmName: 'Yadav Fresh Fields', location: 'Panipat, Haryana', verified: true, yearsFarming: 21 },
  { id: 'farmer_004', name: 'Suresh Malik', farmName: 'Malik Family Farm', location: 'Rohtak, Haryana', verified: true, yearsFarming: 16 },
  { id: 'farmer_005', name: 'Gurpreet Singh', farmName: 'Doaba Harvests', location: 'Samalkha, Panipat', verified: true, yearsFarming: 12 },
  { id: 'farmer_006', name: 'Vikas Sharma', farmName: 'Ganga Plains Farm', location: 'Meerut, Uttar Pradesh', verified: true, yearsFarming: 19 },
  { id: 'farmer_007', name: 'Jaswant Rana', farmName: 'Rana Vegetable Farm', location: 'Kharkhoda, Sonipat', verified: true, yearsFarming: 15 },
  { id: 'farmer_008', name: 'Sunita Devi', farmName: 'Nandi Organic Plot', location: 'Bahalgarh, Sonipat', verified: true, yearsFarming: 11 },
]

export const farmersById = Object.fromEntries(farmers.map((farmer) => [farmer.id, farmer]))
export const farmersByFarm = Object.fromEntries(farmers.map((farmer) => [farmer.farmName, farmer]))
