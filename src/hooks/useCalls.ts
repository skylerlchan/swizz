import { useState, useEffect } from 'react'
import { Call, supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useCalls() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    fetchCalls()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('calls')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'calls',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          fetchCalls()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const fetchCalls = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })

    if (!error) {
      setCalls(data || [])
    }
    setLoading(false)
  }

  const createCall = async (phoneNumber: string, issueDescription: string) => {
    if (!user) return null

    try {
      // Call the initiate-call edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPhone: user.phone || user.email, // Use phone if available, fallback to email
          targetPhone: phoneNumber,
          callReason: issueDescription,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to initiate call')
      }

      const result = await response.json()
      console.log('Call initiated:', result)

      // Refresh calls to get the new call
      await fetchCalls()

      return result
    } catch (error) {
      console.error('Error creating call:', error)
      throw error
    }
  }

  const updateCallStatus = async (callId: string, status: Call['status']) => {
    const { error } = await supabase
      .from('calls')
      .update({ status })
      .eq('id', callId)

    if (error) {
      console.error('Error updating call status:', error)
    }
  }

  const addTranscription = async (
    callId: string, 
    speaker: 'ai' | 'human' | 'user', 
    text: string
  ) => {
    const call = calls.find(c => c.id === callId)
    if (!call) return

    const newTranscription = [
      ...call.transcription,
      {
        timestamp: new Date().toISOString(),
        speaker,
        text,
      }
    ]

    const { error } = await supabase
      .from('calls')
      .update({ transcription: newTranscription })
      .eq('id', callId)

    if (error) {
      console.error('Error adding transcription:', error)
    }
  }

  const requestCallback = async (callId: string) => {
    if (!user) return null

    try {
      const call = calls.find(c => c.id === callId)
      if (!call) throw new Error('Call not found')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/callback-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callId: callId,
          userPhone: user.phone || user.email,
          originalCallSid: call.twilio_call_sid,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to request callback')
      }

      const result = await response.json()
      console.log('Callback requested:', result)

      return result
    } catch (error) {
      console.error('Error requesting callback:', error)
      throw error
    }
  }

  return {
    calls,
    loading,
    createCall,
    updateCallStatus,
    addTranscription,
    requestCallback,
  }
}