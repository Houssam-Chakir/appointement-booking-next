import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'slots'

  try {
    if (action === 'slots') {
      // Get available slots
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_provider_id: '39bc1219-f1ce-482d-93cb-39e5b869ab45',
        p_date: '2025-10-21',
        p_duration_hours: 1
      })

      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    if (action === 'book') {
      // Book appointment
      const { data, error } = await supabase.rpc('book_appointment', {
        p_provider_id: '39bc1219-f1ce-482d-93cb-39e5b869ab45',
        p_user_id: 'a47ca11e-ffc8-448d-9c1a-118ff7873102',
        p_date: '2025-10-21',
        p_start_time: '14:00:00',
        p_duration_hours: 1
      })

      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
