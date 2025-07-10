'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ResultPage() {
  const params = useSearchParams()
  const file = params.get('file')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl mb-4 font-semibold">🎉 Conversion Complete</h1>
      {loading ? (
        <p className="text-sm">Preparing your download...</p>
      ) : (
        <a
          href={`http://localhost:8000${file}`}
          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl text-white transition"
        >
          ⬇️ Download File
        </a>
      )}

      {/* Example Ad Block */}
      <div className="mt-8 w-full max-w-md bg-gray-700 p-4 text-center text-sm rounded-md">
        🅰️ Ad Placeholder - Google AdSense will go here
      </div>
    </main>
  )
}
