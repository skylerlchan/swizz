import React, { useState } from 'react'
import { Phone, MessageSquare, Clock, User, PhoneCall } from 'lucide-react'
import { Call } from '../lib/supabase'
import { CallDetails } from './CallDetails'

interface CallCardProps {
  call: Call
}

export function CallCard({ call }: CallCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getStatusColor = (status: Call['status']) => {
    switch (status) {
      case 'calling':
        return 'bg-blue-100 text-blue-800'
      case 'on_hold':
        return 'bg-amber-100 text-amber-800'
      case 'connected_to_human':
        return 'bg-green-100 text-green-800'
      case 'callback_in_progress':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: Call['status']) => {
    switch (status) {
      case 'calling':
        return <Phone className="w-4 h-4 animate-pulse" />
      case 'on_hold':
        return <Clock className="w-4 h-4" />
      case 'connected_to_human':
        return <User className="w-4 h-4" />
      case 'callback_in_progress':
        return <PhoneCall className="w-4 h-4" />
      default:
        return <Phone className="w-4 h-4" />
    }
  }

  const formatStatus = (status: Call['status']) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const timeElapsed = () => {
    const start = new Date(call.started_at)
    const now = new Date()
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60)
    return `${diff}m ago`
  }

  return (
    <>
      <div 
        className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setShowDetails(true)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{call.phone_number}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{call.issue_description}</p>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(call.status)}`}>
            {getStatusIcon(call.status)}
            <span>{formatStatus(call.status)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-1" />
              {call.transcription.length} messages
            </span>
            <span>Started {timeElapsed()}</span>
          </div>
          {call.callback_requested && (
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
              Callback
            </span>
          )}
        </div>
      </div>

      {showDetails && (
        <CallDetails
          call={call}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  )
}