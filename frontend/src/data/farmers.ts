import type { Farmer } from '../types'

export const farmers: Farmer[] = [
  { id: 'farmer_001', name: 'Ramesh Kumar', farmName: 'Ramesh Farms', location: 'Sonipat, Haryana', verified: true, yearsFarming: 18 },
  { id: 'farmer_002', name: 'Harpreet Singh', farmName: 'Sunehri Khet', location: 'Karnal, Haryana', verified: true, yearsFarming: 14 },
  { id: 'farmer_003', name: 'Rajesh Yadav', farmName: 'Yadav Fresh Fields', location: 'Jhajjar, Haryana', verified: true, yearsFarming: 21 },
  { id: 'farmer_004', name: 'Suresh Malik', farmName: 'Malik Family Farm', location: 'Rohtak, Haryana', verified: true, yearsFarming: 16 },
  { id: 'farmer_005', name: 'Gurpreet Singh', farmName: 'Doaba Harvests', location: 'Panipat, Haryana', verified: true, yearsFarming: 12 },
  { id: 'farmer_006', name: 'Vikas Sharma', farmName: 'Ganga Plains Farm', location: 'Meerut, Uttar Pradesh', verified: true, yearsFarming: 19 },
]

export const farmersById = Object.fromEntries(farmers.map((farmer) => [farmer.id, farmer]))
