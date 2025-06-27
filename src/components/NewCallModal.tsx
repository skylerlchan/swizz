import React, { useState } from 'react'
import { X, Phone, Loader2 } from 'lucide-react'

interface NewCallModalProps {
  onClose: () => void
  onCreateCall: (phoneNumber: string, issueDescription: string) => Promise<any>
}

export function NewCallModal({ onClose, onCreateCall }: NewCallModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onCreateCall(phoneNumber, issueDescription)
      onClose()
    } catch (error) {
      console.error('Error creating call:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Start New Call</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(555) 123-4567"
              required
              maxLength={14}
            />
          </div>

          <div>
            <label htmlFor="issue" className="block text-sm font-medium text-gray-700 mb-2">
              What do you need help with?
            </label>
            <textarea
              id="issue"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe the issue you need assistance with. Swizz will explain this to the representative."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific to help Swizz communicate effectively with the representative
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">How it works</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Swizz will call the number, wait on hold, and handle the initial conversation. 
                  You'll get real-time updates and can take over when a human is available.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Phone className="w-5 h-5 mr-2" />
                  Start Call
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}