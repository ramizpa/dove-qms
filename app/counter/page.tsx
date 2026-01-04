'use client'
import { useEffect, useState, useTransition } from 'react'
import { getTokens, updateTokenStatus, getCounters, getSession, logout } from '../actions'
import { io } from 'socket.io-client'
import { useRouter } from 'next/navigation'

type Token = {
    id: number
    displayId: string
    status: string
    type: string
    service?: { name: string }
    serviceId?: number // Added serviceId to Token type
    counterId?: number // Added counterId to Token type
}

type Counter = {
    id: number
    name: string
    services: { id: number, name: string }[]
}

export default function CounterPage() {
    const router = useRouter()
    const [tokens, setTokens] = useState<Token[]>([])
    const [counters, setCounters] = useState<Counter[]>([])
    const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isConnected, setIsConnected] = useState(false)
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
    const [email, setEmail] = useState('')

    // Load theme from local storage
    useEffect(() => {
        const savedTheme = localStorage.getItem('counter_theme') as any
        if (savedTheme) setTheme(savedTheme)
    }, [])

    const handleThemeChange = (t: 'light' | 'dark' | 'system') => {
        setTheme(t)
        localStorage.setItem('counter_theme', t)
    }

    // Derived values for styling
    const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    // Auth Check
    useEffect(() => {
        getSession().then(session => {
            if (!session) router.push('/login')
        })
    }, [])

    // ... rest of code

    // Load available counters on mount
    useEffect(() => {
        getCounters().then(setCounters)
    }, [])

    // Load tokens and setup socket only when a counter is selected
    useEffect(() => {
        if (!selectedCounter) return

        const fetchTokens = async () => {
            // In a real app, we might filter by the services assigned to this counter
            // For now, we fetch all, or we can filter in the UI
            const t = await getTokens()
            // Filter tokens to only show those for services assigned to this counter
            const assignedServiceIds = selectedCounter.services.map(s => s.id)
            const filtered = (t as any[]).filter(token =>
                !token.serviceId || assignedServiceIds.includes(token.serviceId)
            )
            setTokens(filtered)
        }

        fetchTokens()
        const socket = io()
        socket.on('connect', () => setIsConnected(true))
        socket.on('disconnect', () => setIsConnected(false))
        socket.on('queue_updated', fetchTokens)
        socket.on('config_updated', () => {
            getCounters().then(setCounters) // Reload counter names
            // Re-fetch tokens purely to be safe, though config change shouldn't affect tokens directly
            fetchTokens()
        })
        return () => { socket.disconnect() }
    }, [selectedCounter])

    const handleCall = (id: number) => {
        if (!selectedCounter) return
        startTransition(async () => {
            await updateTokenStatus(id, 'SERVING', selectedCounter.id)
        })
    }

    const handleComplete = (id: number) => {
        startTransition(async () => {
            await updateTokenStatus(id, 'COMPLETED')
        })
    }

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

    if (!selectedCounter) {
        return (
            <div className={`flex flex-col items-center justify-center min-h-screen ${isDark ? 'bg-zinc-900' : 'bg-slate-50'} font-sans`} suppressHydrationWarning>
                <div className="text-center mb-10" suppressHydrationWarning>
                    <div className="w-16 h-16 bg-[#8DC63F] rounded-xl flex items-center justify-center text-zinc-900 text-2xl font-bold mx-auto mb-4" suppressHydrationWarning>Q</div>
                    <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Select Your Counter</h1>
                    <p className={`${isDark ? 'text-zinc-400' : 'text-slate-500'} mt-2`}>Choose your station to start serving</p>
                </div>

                <div className="grid grid-cols-1 gap-4 w-full max-w-md p-4 animate-in fade-in slide-in-from-bottom-4 duration-500" suppressHydrationWarning>
                    {counters.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCounter(c)}
                            className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200'} p-6 rounded-xl shadow-sm border hover:border-[#8DC63F] hover:ring-2 hover:ring-[#8DC63F]/20 transition-all text-left group`}
                        >
                            <div className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-800'} group-hover:text-[#8DC63F]`}>{c.name}</div>
                            <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'} mt-1`}>
                                Serving: {c.services.map(s => s.name).join(', ') || 'All'}
                            </div>
                        </button>
                    ))}
                    {counters.length === 0 && (
                        <div className={`text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            No counters found. <br /> Please create one in the <a href="/admin" className="text-[#8DC63F] font-bold underline">Admin Dashboard</a>.
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const waiting = tokens.filter(t => t.status === 'WAITING')
    const serving = tokens.filter(t => t.status === 'SERVING' && t.counterId === selectedCounter.id)



    // Dynamic Classes
    const bgMain = isDark ? 'bg-zinc-900' : 'bg-slate-50'
    const bgSidebar = isDark ? 'bg-zinc-950' : 'bg-[#717074]' // Dark sidebar for light mode too? Or maybe light? User liked Dark Sidebar in Admin. Let's keep dark-ish for contrast or match Admin.
    // Actually Admin light mode uses bg-[#717074] for sidebar. Let's match that for Light mode.
    const textMain = isDark ? 'text-white' : 'text-slate-900'
    const textMuted = isDark ? 'text-zinc-400' : 'text-slate-500'
    const cardBg = isDark ? 'bg-zinc-800' : 'bg-white'
    const cardBorder = isDark ? 'border-zinc-700' : 'border-slate-200'

    // Update sidebar and backgrounds
    return (
        <div className={`flex h-screen ${bgMain} ${textMain} font-sans transition-colors duration-300`} suppressHydrationWarning>
            {/* Sidebar */}
            <div className={`w-64 ${bgSidebar} text-white p-6 flex flex-col justify-between shadow-xl z-20`}>
                <div>
                    <h1 className="text-2xl font-bold mb-8">{selectedCounter.name}</h1>
                    <button onClick={() => setSelectedCounter(null)} className="text-xs text-[#8DC63F] hover:text-white mb-4 block">← Switch Counter</button>

                    <div className="flex items-center gap-2 mb-8">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-[#8DC63F]' : 'bg-red-500'}`}></div>
                        <span className="text-sm opacity-70">{isConnected ? 'Live' : 'Disconnected'}</span>
                    </div>

                    {/* Theme Selector */}
                    <div className="mb-6">
                        <label className="text-xs font-bold uppercase opacity-50 mb-2 block">Theme</label>
                        <div className="flex bg-black/20 p-1 rounded-lg">
                            {['light', 'dark', 'system'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => handleThemeChange(t as any)}
                                    className={`flex-1 py-1 text-xs font-bold rounded capitalize transition-all ${theme === t ? 'bg-[#8DC63F] text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <button onClick={handleLogout} className="text-sm text-red-300 hover:text-white text-left flex items-center gap-2 font-medium">
                        Log Out
                    </button>
                    <div className="text-sm opacity-50">easyTRACK QMS</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {/* Now Serving */}
                <section className="mb-12">
                    <h2 className={`text-xl font-semibold mb-4 ${textMuted} uppercase tracking-widest`}>Now Serving</h2>

                    {serving.length === 0 ? (
                        <div className={`p-8 border-2 border-dashed ${isDark ? 'border-zinc-800' : 'border-slate-300'} rounded-xl text-center ${textMuted}`}>
                            You are free
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {serving.map(t => (
                                <div key={t.id} className={`p-6 ${cardBg} rounded-xl shadow-lg border-l-8 border-[#8DC63F] flex justify-between items-center ring-1 ring-black/5`}>
                                    <div>
                                        <div className={`text-sm ${textMuted} uppercase font-bold mb-1`}>
                                            {t.service?.name} Ticket
                                        </div>
                                        <div className={`text-5xl font-black ${textMain}`}>{t.displayId}</div>
                                    </div>
                                    <button
                                        disabled={isPending}
                                        onClick={() => handleComplete(t.id)}
                                        className="bg-[#8DC63F] text-zinc-800 px-6 py-3 rounded-lg font-bold hover:bg-[#7cb335] transition shadow-lg shadow-[#8DC63F]/20"
                                    >
                                        Complete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Waiting List */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className={`text-xl font-semibold ${textMuted} uppercase tracking-widest`}>Waiting Queue ({waiting.length})</h2>
                    </div>

                    <div className={`${cardBg} rounded-xl shadow-sm border ${cardBorder} overflow-hidden transition-colors duration-300`}>
                        {waiting.length === 0 ? (
                            <div className={`p-8 text-center ${textMuted}`}>Queue is empty</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className={isDark ? 'bg-zinc-950 text-zinc-400' : 'bg-slate-100 text-slate-500'}>
                                    <tr>
                                        <th className="p-4 font-medium">Ticket</th>
                                        <th className="p-4 font-medium">Service</th>
                                        <th className="p-4 font-medium">Type</th>
                                        <th className="p-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                                    {waiting.map(t => (
                                        <tr key={t.id} className={`transition ${isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-slate-50'}`}>
                                            <td className={`p-4 font-bold text-xl ${textMain}`}>{t.displayId}</td>
                                            <td className={`p-4 ${textMuted}`}>{t.service?.name}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700">{t.type}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    disabled={isPending}
                                                    onClick={() => handleCall(t.id)}
                                                    className={`px-4 py-2 rounded font-bold transition text-sm shadow-md ${isDark ? 'bg-zinc-700 text-white hover:bg-zinc-600' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                                >
                                                    Call
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
