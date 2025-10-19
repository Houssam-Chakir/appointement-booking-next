'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Clock, MapPin, Star } from 'lucide-react'
import Link from 'next/link'

type Provider = {
  id: string
  name: string
  email: string
  phone: string | null
  service_type: string
  bio: string | null
  hourly_rate: number
  currency: string
  avatar_url: string | null
  available_days: number[]
  shift_start: string
  shift_end: string
  is_active: boolean
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [maxRate, setMaxRate] = useState<number>(1000)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const supabase = createClient()

  // Get unique service types
  const serviceTypes = ['all', ...Array.from(new Set(providers.map(p => p.service_type)))]

  // Fetch providers
  useEffect(() => {
    fetchProviders()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = providers

    // Search filter (name, service type, bio)
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.service_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.bio && p.bio.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Service type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.service_type === selectedType)
    }

    // Hourly rate filter
    filtered = filtered.filter(p => p.hourly_rate <= maxRate)

    setFilteredProviders(filtered)
  }, [searchQuery, selectedType, maxRate, providers])

  const fetchProviders = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setProviders(data || [])
      setFilteredProviders(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getDaysText = (days: number[]) => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.sort().map(d => dayNames[d - 1]).join(', ')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Find Your Provider</h1>
          <p className="text-gray-600">
            Browse through our verified professionals and book an appointment
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="space-y-6">
            {/* Search */}
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name, service, or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Service Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="service-type">Service Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger id="service-type">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type === 'all' ? 'All Services' : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Rate Filter */}
              <div className="space-y-2">
                <Label htmlFor="max-rate">
                  Max Rate: <span className="font-semibold">{maxRate} MAD/hr</span>
                </Label>
                <Slider
                  id="max-rate"
                  min={0}
                  max={1000}
                  step={50}
                  value={[maxRate]}
                  onValueChange={(value) => setMaxRate(value[0])}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0 MAD</span>
                  <span>1000 MAD</span>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredProviders.length}</span> of{' '}
                <span className="font-semibold">{providers.length}</span> providers
              </div>
            </div>
          </div>
        </div>
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading providers...</p>
          </div>
        )}

        {/* Providers Grid */}
        {!loading && filteredProviders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 text-lg">No providers found matching your criteria</p>
            <Button
              onClick={() => {
                setSearchQuery('')
                setSelectedType('all')
                setMaxRate(1000)
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {!loading && filteredProviders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
              >
                {/* Provider Header */}
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={provider.avatar_url || undefined} alt={provider.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                      {getInitials(provider.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{provider.name}</h3>
                    <p className="text-sm text-gray-600">{provider.service_type}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-600">4.8 (120)</span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {provider.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {provider.bio}
                  </p>
                )}

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      {provider.shift_start.slice(0, 5)} - {provider.shift_end.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{getDaysText(provider.available_days)}</span>
                  </div>
                </div>

                {/* Price & Action */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {provider.hourly_rate} <span className="text-sm font-normal text-gray-600">{provider.currency}</span>
                    </div>
                    <div className="text-xs text-gray-500">per hour</div>
                  </div>
                  <Link href={`/providers/${provider.id}`}>
                    <Button>
                      Book Now
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
