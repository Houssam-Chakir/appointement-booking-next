'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Slot = {
  slot_time: string
  is_available: boolean
}

type BookingResult = {
  success: boolean
  booking_group_id: string | null
  message: string
}

export default function TestPage() {
  const [providerId, setProviderId] = useState('39bc1219-f1ce-482d-93cb-39e5b869ab45')
  const [userId, setUserId] = useState('a47ca11e-ffc8-448d-9c1a-118ff7873102')
  const [date, setDate] = useState('2025-10-22')
  const [startTime, setStartTime] = useState('14:00:00')
  const [duration, setDuration] = useState(1)
  
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  // Test 1: Get Available Slots
  const testGetSlots = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_provider_id: providerId,
        p_date: date,
        p_duration_hours: duration
      })

      if (error) throw error
      setSlots(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Test 2: Book Appointment
  const testBookAppointment = async () => {
    setLoading(true)
    setError('')
    setBookingResult(null)
    try {
      const { data, error } = await supabase.rpc('book_appointment', {
        p_provider_id: providerId,
        p_user_id: userId,
        p_date: date,
        p_start_time: startTime,
        p_duration_hours: duration
      })

      if (error) throw error
      setBookingResult(data[0])
      
      // Refresh appointments list
      if (data[0].success) {
        await testGetAppointments()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Test 3: Get User Appointments
  const testGetAppointments = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          providers (
            name,
            service_type,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('appointment_date', { ascending: true })
        .order('time_slot', { ascending: true })

      if (error) throw error
      setAppointments(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Test 4: Get Providers
  const testGetProviders = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('is_active', true)

      if (error) throw error
      setProviders(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Test 5: Cancel Appointment
  const testCancelAppointment = async (appointmentId: string) => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)

      if (error) throw error
      await testGetAppointments()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Booking System Test Dashboard</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Configuration Section */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Provider ID</label>
            <Input
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              placeholder="Provider UUID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">User ID</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User UUID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Start Time</label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value + ':00')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Duration (hours)</label>
            <Input
              type="number"
              min="1"
              max="8"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Test Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Button onClick={testGetSlots} disabled={loading}>
          1. Get Available Slots
        </Button>
        <Button onClick={testBookAppointment} disabled={loading}>
          2. Book Appointment
        </Button>
        <Button onClick={testGetAppointments} disabled={loading}>
          3. Get My Appointments
        </Button>
        <Button onClick={testGetProviders} disabled={loading}>
          4. Get Providers
        </Button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Slots */}
        {slots.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Available Slots ({slots.filter(s => s.is_available).length}/{slots.length})
            </h2>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-2 rounded text-sm font-medium ${
                      slot.is_available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {slot.slot_time} {slot.is_available ? '✓' : '✗'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Booking Result */}
        {bookingResult && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Booking Result</h2>
            <div className={`p-4 rounded ${
              bookingResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <p className="font-semibold mb-2">
                Status: {bookingResult.success ? '✅ Success' : '❌ Failed'}
              </p>
              <p className="text-sm mb-2">Message: {bookingResult.message}</p>
              {bookingResult.booking_group_id && (
                <p className="text-xs text-gray-600 break-all">
                  Booking ID: {bookingResult.booking_group_id}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Providers List */}
        {providers.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Active Providers ({providers.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setProviderId(provider.id)}
                >
                  <p className="font-semibold">{provider.name}</p>
                  <p className="text-sm text-gray-600">{provider.service_type}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {provider.hourly_rate} {provider.currency}/hr
                  </p>
                  <p className="text-xs text-gray-400 mt-1 break-all">
                    ID: {provider.id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appointments List */}
        {appointments.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              My Appointments ({appointments.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {appointments.map((apt) => (
                <div key={apt.id} className="border rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{apt.providers?.name}</p>
                      <p className="text-sm text-gray-600">
                        {apt.providers?.service_type}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-sm mb-1">
                    📅 {apt.appointment_date} at {apt.time_slot}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Group: {apt.booking_group_id}
                  </p>
                  {apt.status !== 'cancelled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testCancelAppointment(apt.id)}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
