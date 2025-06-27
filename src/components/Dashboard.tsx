import React, { useState } from 'react'
import { Phone, Plus, History, User, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCalls } from '../hooks/useCalls'
import { CallCard } from './CallCard'
import { NewCallModal } from './NewCallModal'
import { CallHistory } from './CallHistory'

export function Dashboard() {
  const [showNewCall, setShowNewCall] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const { user, signOut } = useAuth()
  const { calls, createCall } = useCalls()

  const activeCalls = calls.filter(call => 
    ['calling', 'on_hold', 'connected_to_human', 'callback_in_progress'].includes(call.status)
  )

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Phone className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Swizz</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowHistory(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <History className="w-5 h-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <User className="w-5 h-5" />
                </button>
                {showProfile && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                    <div className="p-3 border-b">
                      <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Calls Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Active Calls</h2>
            <button
              onClick={() => setShowNewCall(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Call
            </button>
          </div>

          {activeCalls.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active calls</h3>
              <p className="text-gray-600 mb-4">Start a new call to let Swizz handle the wait for you</p>
              <button
                onClick={() => setShowNewCall(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Start First Call
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeCalls.map(call => (
                <CallCard key={call.id} call={call} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Calls Preview */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Calls</h3>
              <button
                onClick={() => setShowHistory(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View all
              </button>
            </div>
          </div>
          <div className="p-6">
            {calls.slice(0, 3).map(call => (
              <div key={call.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{call.phone_number}</p>
                  <p className="text-sm text-gray-600 truncate">{call.issue_description}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    call.status === 'completed' ? 'bg-green-100 text-green-800' :
                    call.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {call.status.replace('_', ' ')}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(call.started_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showNewCall && (
        <NewCallModal
          onClose={() => setShowNewCall(false)}
          onCreateCall={createCall}
        />
      )}

      {showHistory && (
        <CallHistory
          calls={calls}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}