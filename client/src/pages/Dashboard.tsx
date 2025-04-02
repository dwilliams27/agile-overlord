import React from 'react'
import { Link } from 'react-router-dom'

const Dashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Agile Overlord Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/teamchat" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-4">TeamChat</h2>
          <p className="text-gray-600 mb-4">Simulated team communication</p>
          <div className="bg-indigo-100 text-indigo-800 inline-block px-3 py-1 rounded text-sm font-medium">
            Ready
          </div>
        </Link>
        <Link to="/tasklord" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-4">TaskLord</h2>
          <p className="text-gray-600 mb-4">Ticket management system</p>
          <div className="bg-blue-100 text-blue-800 inline-block px-3 py-1 rounded text-sm font-medium">
            Ready
          </div>
        </Link>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">GitHub</h2>
          <p className="text-gray-600 mb-4">Code repository and PR reviews</p>
          <div className="bg-gray-100 text-gray-800 inline-block px-3 py-1 rounded text-sm font-medium">
            Coming soon
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard