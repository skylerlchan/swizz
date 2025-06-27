import React, { useState } from 'react'
import { X, Phone, MessageSquare, User, PhoneCall, Clock } from 'lucide-react'
import { Call } from '../lib/supabase'
import { useCalls } from '../hooks/useCalls'

interface CallDetailsProps {
  call: Call
  onClose: () => void
}

export function CallDetails({ call, onClose }: CallDetailsProps) {
  const [userTakeover, setUserTakeover] = useState(false)
  const { updateCallStatus, addTranscription } = useCalls()

  const handleTakeOverCall = () => {
    setUserTakeover(true)
    // In a real implementation, this would connect the user to the call
    addTranscription(call.id, 'user', 'User has taken over the call')
  }

  const handleRequestCallback = async () => {
    await updateCallStatus(call.id, 'callback_in_progress')
    addTranscription(call.id, 'ai', 'Callback requested - will notify when human is available')
  }

  const getStatusColor = (status: Call['status']) => {
    switch (status) {
      case 'calling':
        return 'text-blue-600'
      case 'on_hold':
        return 'text-amber-600'
      case 'connected_to_human':
        return 'text-green-600'
      case 'callback_in_progress':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{call.phone_number}</h2>
            <p className="text-sm text-gray-600 mt-1">{call.issue_description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                call.status === 'calling' ? 'bg-blue-100' :
                call.status === 'on_hold' ? 'bg-amber-100' :
                call.status === 'connected_to_human' ? 'bg-green-100' :
                'bg-purple-100'
              }`}>
                {call.status === 'calling' && <Phone className="w-5 h-5 text-blue-600 animate-pulse" />}
                {call.status === 'on_hold' && <Clock className="w-5 h-5 text-amber-600" />}
                {call.status === 'connected_to_human' && <User className="w-5 h-5 text-green-600" />}
                {call.status === 'callback_in_progress' && <PhoneCall className="w-5 h-5 text-purple-600" />}
              </div>
              <div>
                <h3 className={`font-medium ${getStatusColor(call.status)}`}>
                  {call.status.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </h3>
                <p className="text-sm text-gray-500">
                  Started {new Date(call.started_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              {call.status === 'connected_to_human' && !userTakeover && (
                <button
                  onClick={handleTakeOverCall}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Speak to Agent
                </button>
              )}
              {(call.status === 'on_hold' || call.status === 'calling') && !call.callback_requested && (
                <button
                  onClick={handleRequestCallback}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 flex items-center"
                >
                  <PhoneCall className="w-4 h-4 mr-2" />
                  Request Callback
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Transcription */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 border-b">
            <h3 className="font-medium text-gray-900 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Live Transcription
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {call.transcription.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Transcription will appear here once the call begins</p>
              </div>
            ) : (
              call.transcription.map((entry, index) => (
                <div
                  key={index}
                  className={`flex ${entry.speaker === 'ai' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    entry.speaker === 'ai' ? 'bg-blue-100 text-blue-900' :
                    entry.speaker === 'human' ? 'bg-gray-100 text-gray-900' :
                    'bg-green-100 text-green-900'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium uppercase tracking-wide">
                        {entry.speaker === 'ai' ? 'Swizz AI' : 
                         entry.speaker === 'human' ? 'Agent' : 'You'}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{entry.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}