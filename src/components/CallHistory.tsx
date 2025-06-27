import React from 'react'
import { X, Phone, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Call } from '../lib/supabase'

interface CallHistoryProps {
  calls: Call[]
  onClose: () => void
}

export function CallHistory({ calls, onClose }: CallHistoryProps) {
  const getStatusIcon = (status: Call['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-blue-600" />
    }
  }

  const getStatusColor = (status: Call['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
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

  const formatDuration = (call: Call) => {
    if (!call.completed_at) return 'Ongoing'
    
    const start = new Date(call.started_at)
    const end = new Date(call.completed_at)
    const minutes = Math.floor((end.getTime() - start.getTime()) / 1000 / 60)
    
    if (minutes < 1) return '< 1 min'
    if (minutes < 60) return `${minutes} min`
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Call History</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {calls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No calls yet</h3>
              <p className="text-gray-600">Your call history will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {calls.map(call => (
                <div key={call.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getStatusIcon(call.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{call.phone_number}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                            {call.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{call.issue_description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{new Date(call.started_at).toLocaleDateString()}</span>
                          <span>{new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>Duration: {formatDuration(call)}</span>
                          {call.transcription.length > 0 && (
                            <span>{call.transcription.length} messages</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {call.callback_requested && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                        Callback
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}