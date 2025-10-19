'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock, MapPin, Star, ArrowLeft, CalendarIcon } from 'lucide-react'
import Link from 'next/link'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import './calendar.css'

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

type Slot = {
  slot_time: string
  is_available: boolean
}

type UserAppointment = {
  id: string
  appointment_date: string
  time_slot: string
  booking_group_id: string
}

export default function ProviderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const providerId = params.id as string
  
  const [provider, setProvider] = useState<Provider | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 1)))
  const [duration, setDuration] = useState(0.5) // Default to 30 minutes
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [error, setError] = useState('')
  const [bookingResult, setBookingResult] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userAppointments, setUserAppointments] = useState<UserAppointment[]>([])

  const supabase = createClient()

  useEffect(() => {
    fetchProvider()
    fetchCurrentUser()
  }, [providerId])

  useEffect(() => {
    if (selectedDate && provider) {
      fetchAvailableSlots()
      if (currentUser) {
        fetchUserAppointments()
      }
    }
  }, [selectedDate, duration, provider, currentUser])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const fetchUserAppointments = async () => {
    if (!currentUser) return
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_date, time_slot, booking_group_id')
        .eq('provider_id', providerId)
        .eq('user_id', currentUser.id)
        .eq('appointment_date', dateStr)
        .in('status', ['pending', 'confirmed'])
      
      if (error) throw error
      setUserAppointments(data || [])
    } catch (err: any) {
      console.error('Error fetching user appointments:', err)
    }
  }

  const fetchProvider = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', providerId)
        .single()

      if (error) throw error
      setProvider(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableSlots = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_provider_id: providerId,
        p_date: dateStr,
        p_duration_hours: Math.ceil(duration) // Round up for API call
      })

      if (error) throw error
      setSlots(data || [])
    } catch (err: any) {
      console.error('Error fetching slots:', err)
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot) return

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setBookingLoading(true)
    setError('')
    setBookingResult(null)

    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const { data, error } = await supabase.rpc('book_appointment', {
        p_provider_id: providerId,
        p_user_id: user.id,
        p_date: dateStr,
        p_start_time: selectedSlot,
        p_duration_hours: Math.ceil(duration)
      })

      if (error) throw error
      
      setBookingResult(data[0])
      
      if (data[0].success) {
        // Refresh slots and user appointments
        await fetchAvailableSlots()
        await fetchUserAppointments()
        setSelectedSlot(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBookingLoading(false)
    }
  }

  const isDateDisabled = ({ date }: { date: Date }) => {
    if (!provider) return true
    
    // Disable past dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return true
    
    // Disable days provider doesn't work (1=Mon, 7=Sun in DB)
    const dayOfWeek = date.getDay() // 0=Sun, 6=Sat in JS
    const dbDay = dayOfWeek === 0 ? 7 : dayOfWeek // Convert to DB format
    return !provider.available_days.includes(dbDay)
  }

  const isUserSlot = (slotTime: string) => {
    return userAppointments.some(apt => apt.time_slot === slotTime)
  }

  const formatDuration = (hours: number) => {
    if (hours < 1) return '30 minutes'
    if (hours === 1) return '1 hour'
    return `${hours} hours`
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
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days.sort().map(d => dayNames[d - 1]).join(', ')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading provider details...</p>
        </div>
      </div>
    )
  }

  if (error && !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/providers">
            <Button>Back to Providers</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!provider) return null

  const availableSlots = slots.filter(s => s.is_available)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <Link href="/providers">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Providers
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Provider Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <div className="text-center mb-6">
                <Avatar className="h-32 w-32 mx-auto mb-4">
                  <AvatarImage src={provider.avatar_url || undefined} alt={provider.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-3xl">
                    {getInitials(provider.name)}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold mb-2">{provider.name}</h1>
                <p className="text-gray-600 mb-3">{provider.service_type}</p>
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">4.8</span>
                  <span className="text-gray-600">(120 reviews)</span>
                </div>
              </div>

              {provider.bio && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-sm text-gray-600">{provider.bio}</p>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">Working Hours</div>
                    <div className="text-gray-600">
                      {provider.shift_start.slice(0, 5)} - {provider.shift_end.slice(0, 5)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">Available Days</div>
                    <div className="text-gray-600">{getDaysText(provider.available_days)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">Hourly Rate</div>
                    <div className="text-gray-600">
                      {provider.hourly_rate} {provider.currency}/hour
                    </div>
                  </div>
                </div>
              </div>

              {provider.phone && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">Contact</p>
                  <p className="font-medium">{provider.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6">Book an Appointment</h2>

              {/* Calendar */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Select Date</h3>
                <Calendar
                  onChange={(value: any) => {
                    if (value instanceof Date) {
                      setSelectedDate(value)
                      setSelectedSlot(null)
                    }
                  }}
                  value={selectedDate}
                  tileDisabled={isDateDisabled}
                  minDate={new Date()}
                  className="mx-auto border rounded-lg"
                />
              </div>

              {/* Duration Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => {
                    setDuration(Number(e.target.value))
                    setSelectedSlot(null)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0.5}>30 minutes - {(provider.hourly_rate * 0.5).toFixed(0)} {provider.currency}</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                    <option key={h} value={h}>
                      {h} hour{h > 1 ? 's' : ''} - {provider.hourly_rate * h} {provider.currency}
                    </option>
                  ))}
                </select>
              </div>

              {/* Available Slots */}
              <div className="mb-6">
                <h3 className="font-semibold mb-4">
                  Available Time Slots ({availableSlots.length} available)
                </h3>
                
                {slots.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Select a date to see available slots
                  </p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No available slots for the selected date and duration
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {slots.map((slot) => {
                      const isBooked = !slot.is_available
                      const isMine = isUserSlot(slot.slot_time)
                      const isSelected = selectedSlot === slot.slot_time
                      
                      return (
                        <button
                          key={slot.slot_time}
                          onClick={() => !isBooked && setSelectedSlot(slot.slot_time)}
                          disabled={isBooked && !isMine}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : isMine
                              ? 'bg-green-100 text-green-800 border-2 border-green-500'
                              : isBooked
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed line-through'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {slot.slot_time.slice(0, 5)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {/* Booking Result */}
              {bookingResult && (
                <div className={`px-4 py-3 rounded mb-4 ${
                  bookingResult.success 
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <p className="font-semibold">{bookingResult.message}</p>
                  {bookingResult.success && (
                    <p className="text-sm mt-1">
                      Your appointment has been confirmed. Booking ID: {bookingResult.booking_group_id}
                    </p>
                  )}
                </div>
              )}

              {/* Book Button */}
              <Button
                onClick={handleBooking}
                disabled={!selectedSlot || bookingLoading}
                className="w-full"
                size="lg"
              >
                {bookingLoading ? 'Booking...' : `Book ${formatDuration(duration)} - ${(provider.hourly_rate * duration).toFixed(0)} ${provider.currency}`}
              </Button>

              {selectedSlot && (
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Booking {provider.name} for {formatDuration(duration)} starting at {selectedSlot.slice(0, 5)} on {selectedDate.toLocaleDateString()}
                </p>
              )}

              {/* Legend */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium mb-2">Legend:</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 border rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
                    <span>Your booking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded line-through"></div>
                    <span>Booked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
