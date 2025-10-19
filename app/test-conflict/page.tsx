'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

type BookingResult = {
  userId: string
  success: boolean
  message: string
  bookingId?: string
  timestamp: number
  duration: number
}

export default function ConflictTestPage() {
  const [providerId, setProviderId] = useState('39bc1219-f1ce-482d-93cb-39e5b869ab45')
  const [user1Id, setUser1Id] = useState('a47ca11e-ffc8-448d-9c1a-118ff7873102')
  const [user2Id, setUser2Id] = useState('') // Will need a second test user
  const [date, setDate] = useState('2025-10-25')
  const [timeSlot, setTimeSlot] = useState('14:00:00')
  const [duration, setDuration] = useState(1)
  
  const [results, setResults] = useState<BookingResult[]>([])
  const [testing, setTesting] = useState(false)
  const [testType, setTestType] = useState<'simultaneous' | 'sequential'>('simultaneous')

  const supabase = createClient()

  // Single booking function
  const bookAppointment = async (userId: string, userLabel: string): Promise<BookingResult> => {
    const startTime = Date.now()
    try {
      const { data, error } = await supabase.rpc('book_appointment', {
        p_provider_id: providerId,
        p_user_id: userId,
        p_date: date,
        p_start_time: timeSlot,
        p_duration_hours: duration
      })

      const endTime = Date.now()

      if (error) throw error
      
      return {
        userId: userLabel,
        success: data[0].success,
        message: data[0].message,
        bookingId: data[0].booking_group_id,
        timestamp: endTime,
        duration: endTime - startTime
      }
    } catch (err: any) {
      const endTime = Date.now()
      return {
        userId: userLabel,
        success: false,
        message: err.message,
        timestamp: endTime,
        duration: endTime - startTime
      }
    }
  }

  // Test simultaneous bookings (race condition)
  const testSimultaneous = async () => {
    if (!user2Id) {
      alert('Please provide User 2 ID')
      return
    }

    setTesting(true)
    setResults([])

    try {
      // Fire both requests at the EXACT same time
      const [result1, result2] = await Promise.all([
        bookAppointment(user1Id, 'User 1'),
        bookAppointment(user2Id, 'User 2')
      ])

      setResults([result1, result2])
    } catch (err) {
      console.error('Test error:', err)
    } finally {
      setTesting(false)
    }
  }

  // Test sequential bookings (should always fail on second)
  const testSequential = async () => {
    if (!user2Id) {
      alert('Please provide User 2 ID')
      return
    }

    setTesting(true)
    setResults([])

    try {
      // First booking
      const result1 = await bookAppointment(user1Id, 'User 1')
      setResults([result1])

      // Small delay to show the order
      await new Promise(resolve => setTimeout(resolve, 100))

      // Second booking
      const result2 = await bookAppointment(user2Id, 'User 2')
      setResults([result1, result2])
    } catch (err) {
      console.error('Test error:', err)
    } finally {
      setTesting(false)
    }
  }

  // Clear all appointments for the test slot
  const clearTestSlot = async () => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('provider_id', providerId)
        .eq('appointment_date', date)
        .eq('time_slot', timeSlot)

      if (error) throw error
      alert('Test slot cleared successfully!')
      setResults([])
    } catch (err: any) {
      alert('Error clearing slot: ' + err.message)
    }
  }

  // Create a second test user
  const createTestUser = async () => {
    try {
      // This will create a user in auth, but for testing we can use any UUID
      const testUserId = crypto.randomUUID()
      setUser2Id(testUserId)
      alert(`Generated test user ID: ${testUserId}\n\nNote: This is just a UUID. In production, you'd need a real authenticated user.`)
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Booking Conflict Test</h1>
          <p className="text-gray-600">
            Test race conditions and concurrent booking conflicts
          </p>
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Provider ID</label>
              <Input
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                placeholder="Provider UUID"
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
              <label className="block text-sm font-medium mb-2">Time Slot</label>
              <Input
                type="time"
                value={timeSlot.slice(0, 5)}
                onChange={(e) => setTimeSlot(e.target.value + ':00')}
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

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-3">Test Users</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">User 1 ID</label>
                <Input
                  value={user1Id}
                  onChange={(e) => setUser1Id(e.target.value)}
                  placeholder="User 1 UUID"
                />
                <p className="text-xs text-gray-500 mt-1">Default test user</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">User 2 ID</label>
                <div className="flex gap-2">
                  <Input
                    value={user2Id}
                    onChange={(e) => setUser2Id(e.target.value)}
                    placeholder="User 2 UUID"
                  />
                  <Button onClick={createTestUser} variant="outline" size="sm">
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Second test user for conflict</p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={testSimultaneous}
              disabled={testing || !user2Id}
              className="flex-1 min-w-[200px]"
              size="lg"
            >
              {testing && testType === 'simultaneous' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                '⚡ Test Simultaneous Booking'
              )}
            </Button>

            <Button
              onClick={testSequential}
              disabled={testing || !user2Id}
              className="flex-1 min-w-[200px]"
              size="lg"
              variant="outline"
            >
              {testing && testType === 'sequential' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                '📋 Test Sequential Booking'
              )}
            </Button>

            <Button
              onClick={clearTestSlot}
              disabled={testing}
              variant="destructive"
              size="lg"
            >
              🗑️ Clear Test Slot
            </Button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Simultaneous:</strong> Both requests fire at exactly the same time (Promise.all) to test race conditions.
              <br />
              <strong>Sequential:</strong> User 1 books first, then User 2 tries the same slot (should always fail).
            </p>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Test Results</h2>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Success: {successCount}
                </span>
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Failed: {failCount}
                </span>
              </div>
            </div>

            {/* Expected Result */}
            <div className={`p-4 rounded mb-4 ${
              successCount === 1 && failCount === 1
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <p className="font-semibold mb-1">
                {successCount === 1 && failCount === 1 ? '✅ Expected Result' : '⚠️ Unexpected Result'}
              </p>
              <p className="text-sm">
                {successCount === 1 && failCount === 1
                  ? 'Exactly one booking succeeded and one failed - conflict prevention is working correctly!'
                  : successCount === 2
                  ? '❌ PROBLEM: Both bookings succeeded! Double-booking occurred.'
                  : failCount === 2
                  ? '❌ PROBLEM: Both bookings failed. Something is wrong.'
                  : 'Check the results below.'}
              </p>
            </div>

            {/* Individual Results */}
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <h3 className="font-semibold">{result.userId}</h3>
                    </div>
                    <span className="text-xs text-gray-600">
                      {result.duration}ms
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                      <strong>Status:</strong> {result.success ? 'Success' : 'Failed'}
                    </p>
                    <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                      <strong>Message:</strong> {result.message}
                    </p>
                    {result.bookingId && (
                      <p className="text-gray-600 text-xs break-all">
                        <strong>Booking ID:</strong> {result.bookingId}
                      </p>
                    )}
                    <p className="text-gray-500 text-xs">
                      <strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleTimeString()}.{result.timestamp % 1000}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Timing Analysis */}
            {results.length === 2 && (
              <div className="mt-4 p-4 bg-gray-50 border rounded">
                <h3 className="font-semibold mb-2">Timing Analysis</h3>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>User 1 Response Time:</strong> {results[0].duration}ms
                  </p>
                  <p>
                    <strong>User 2 Response Time:</strong> {results[1].duration}ms
                  </p>
                  <p>
                    <strong>Time Difference:</strong> {Math.abs(results[0].timestamp - results[1].timestamp)}ms
                  </p>
                  <p className="text-gray-600 mt-2">
                    {Math.abs(results[0].timestamp - results[1].timestamp) < 100
                      ? '⚡ Requests were truly simultaneous (race condition)'
                      : '📋 Requests were sequential'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to Use</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Configure the provider, date, time, and duration you want to test</li>
            <li>Generate or enter a second test user ID (User 2)</li>
            <li>Click "Clear Test Slot" to ensure the slot is available</li>
            <li>Click "Test Simultaneous Booking" to fire both requests at the same time</li>
            <li>Check results - exactly ONE should succeed (conflict prevention working!)</li>
            <li>Try "Test Sequential Booking" to see how sequential requests behave</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
