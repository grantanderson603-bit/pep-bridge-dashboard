import { useState, useEffect, useRef } from 'react'
import { Hotel, Activity, Users, DoorOpen, DoorClosed, Wifi, WifiOff, TrendingUp, DollarSign, Clock } from 'lucide-react'

function App() {
  const [data, setData] = useState(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [activeTab, setActiveTab] = useState('arrivals')
  const wsRef = useRef(null)

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3001`
    
    const connectWS = () => {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setConnected(true)
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'PEP_SNAPSHOT') {
          setData(msg.data)
          setLastUpdate(new Date(msg.data.meta.fetched_at))
        }
        if (msg.type === 'PEP_DELTA' && msg.data.changes.new_checkins) {
          console.log('New check-ins:', msg.data.changes.new_checkins)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setConnected(false)
        setTimeout(connectWS, 3000)
      }

      ws.onerror = (err) => {
        console.error('WebSocket error:', err)
        ws.close()
      }
    }

    connectWS()
    return () => { if (wsRef.current) wsRef.current.close() }
  }, [])

  const d = data?.dashboard || {}
  const prop = data?.meta?.property

  const MetricCard = ({ icon: Icon, label, value, color, trend }) => (
    <div className="bg-pep-card rounded-xl p-5 border border-pep-border hover:border-pep-blue transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {trend && <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/>{trend}</p>}
        </div>
        <Icon className={`w-8 h-8 ${color} opacity-70`} />
      </div>
    </div>
  )

  const GuestRow = ({ guest, type }) => {
    const name = guest.guest ? `${guest.guest.last_name}, ${guest.guest.first_name}` : 'N/A'
    const isCheckedIn = guest.status === 'CHECKED_IN'
    const statusColor = isCheckedIn ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700' : 'bg-blue-900/30 text-blue-400 border-blue-700'
    
    return (
      <div className="bg-pep-card rounded-lg p-4 border-l-4 border-pep-blue hover:border-pep-accent transition-all">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white">{name}</span>
              {guest.vip && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700 font-bold">VIP</span>}
              {guest.is_digital_checkin && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-700 font-semibold">Digital</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${statusColor}`}>{guest.status}</span>
            </div>
            <div className="text-sm text-slate-400 flex gap-4">
              <span>Rm: {guest.room_number || 'TBA'}</span>
              <span>{guest.no_of_nights || 0}N</span>
              <span>Conf: {guest.confirmation_no}</span>
              {guest.room_type_name && <span className="text-slate-500">{guest.room_type_name}</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pep-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Waiting for PEP Bridge data...</p>
          <p className="text-xs text-slate-500 mt-2">{connected ? 'Connected to server' : 'Connecting...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pep-dark">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-pep-card border-b-2 border-pep-blue shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Hotel className="w-8 h-8 text-pep-accent" />
              <div>
                <h1 className="text-2xl font-bold text-white">{prop?.name || 'PEP Bridge Dashboard'}</h1>
                <p className="text-xs text-slate-400">{prop?.code} • Real-Time Hotel Operations</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-400">Last Sync</div>
                <div className="text-sm text-white font-mono">
                  {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--'}
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${connected ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                {connected ? <><Wifi className="w-4 h-4 pulse-green" /> LIVE</> : <><WifiOff className="w-4 h-4" /> Offline</>}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard icon={Users} label="In-House" value={d.in_house ?? '--'} color="text-blue-400" />
          <MetricCard icon={DoorOpen} label="Available" value={d.available ?? '--'} color="text-emerald-400" />
          <MetricCard icon={Activity} label="Occupancy" value={(d.occupancy_pct ?? '--') + '%'} color="text-amber-400" />
          <MetricCard icon={DoorClosed} label="Arrivals Today" value={d.arrivals_expected ?? '--'} color="text-purple-400" />
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <MetricCard icon={Clock} label="Dirty Rooms" value={d.dirty ?? '--'} color="text-red-400" />
          <MetricCard icon={DollarSign} label="ADR" value={d.adr ? `$${Math.round(d.adr)}` : '--'} color="text-emerald-400" />
          <MetricCard icon={TrendingUp} label="Room Revenue" value={d.room_revenue ? `$${Math.round(d.room_revenue).toLocaleString()}` : '--'} color="text-blue-400" trend={d.group_count > 0 ? `${d.group_count} groups` : null} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-pep-border mb-6">
          <button onClick={() => setActiveTab('arrivals')} className={`px-6 py-3 font-semibold transition-all ${activeTab === 'arrivals' ? 'border-b-2 border-pep-accent text-pep-accent' : 'text-slate-400 hover:text-white'}`}>
            Arrivals ({data.arrivals?.length || 0})
          </button>
          <button onClick={() => setActiveTab('in-house')} className={`px-6 py-3 font-semibold transition-all ${activeTab === 'in-house' ? 'border-b-2 border-pep-accent text-pep-accent' : 'text-slate-400 hover:text-white'}`}>
            In-House ({data.in_house?.length || 0})
          </button>
        </div>

        {/* Guest List */}
        <div className="space-y-3">
          {activeTab === 'arrivals' && (data.arrivals || []).slice(0, 50).map(r => <GuestRow key={r.id} guest={r} type="arrival" />)}
          {activeTab === 'in-house' && (data.in_house || []).slice(0, 50).map(r => <GuestRow key={r.id} guest={r} type="in-house" />)}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-slate-500">
          <p>PEP Bridge v1.0 • Business Date: {data.meta?.business_date}</p>
          <p className="mt-1">Built for {prop?.name}</p>
        </div>
      </div>
    </div>
  )
}

export default App
