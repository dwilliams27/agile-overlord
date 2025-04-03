import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import FoolsForum from './components/foolsforum/FoolsForum'
import TaskLord from './pages/TaskLord'

function App() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/foolsforum" element={<FoolsForum />} />
        <Route path="/tasklord" element={<TaskLord />} />
      </Routes>
    </div>
  )
}

export default App