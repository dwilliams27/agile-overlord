import React from 'react'
import { Link } from 'react-router-dom'

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-gray-200 text-center py-4 border-b border-gray-700">
          AGILE OVERLORD COMMAND CENTER
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link 
            to="/foolsforum" 
            className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:-translate-y-1 border-2 border-red-500"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-2">🃏</span>
              <h2 className="text-2xl font-bold text-purple-800">Fool's Forum</h2>
            </div>
            <p className="text-red-700 mb-6 font-medium">Where jesters exchange witty banter</p>
            <div className="bg-green-600 text-yellow-100 inline-block px-4 py-2 rounded-full text-sm font-bold border border-yellow-400">
              Ready to Jest!
            </div>
          </Link>
          
          <Link 
            to="/tasklord" 
            className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:-translate-y-1 border border-red-900"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-2">⚒️</span>
              <h2 className="text-2xl font-bold text-red-700">TaskLord</h2>
            </div>
            <p className="text-gray-400 mb-6">Controlled execution of assigned duties</p>
            <div className="bg-red-900 text-gray-200 inline-block px-4 py-2 rounded text-sm font-bold">
              OPERATIONAL
            </div>
          </Link>
          
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-2">⚙️</span>
              <h2 className="text-2xl font-bold text-gray-400">CodeCastle</h2>
            </div>
            <p className="text-gray-500 mb-6">Source control and enforcement</p>
            <div className="bg-gray-700 text-gray-400 inline-block px-4 py-2 rounded text-sm font-bold">
              DEPLOYMENT PENDING
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard