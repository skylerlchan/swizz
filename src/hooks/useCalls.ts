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

    const { data, error } = await supabase
      .from('calls')
      .insert({
        user_id: user.id,
        phone_number: phoneNumber,
        issue_description: issueDescription,
        status: 'calling',
        transcription: [],
        started_at: new Date().toISOString(),
        callback_requested: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating call:', error)
      return null
    }

    return data
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

  return {
    calls,
    loading,
    createCall,
    updateCallStatus,
    addTranscription,
  }
}