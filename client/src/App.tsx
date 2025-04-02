import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TeamChat from './components/teamchat/TeamChat'

function App() {
  return (
    <div className="h-screen w-full overflow-hidden bg-gray-100">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/teamchat" element={<TeamChat />} />
      </Routes>
    </div>
  )
}

export default App