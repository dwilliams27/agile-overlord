import React from 'react'

const Dashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Agile Overlord Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Slack</h2>
          <p className="text-gray-600">Simulated team communication</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Jira</h2>
          <p className="text-gray-600">Ticket management system</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">GitHub</h2>
          <p className="text-gray-600">Code repository and PR reviews</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard