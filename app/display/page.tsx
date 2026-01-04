'use client'
import { useEffect, useState } from 'react'
import { getTokens, getCounters, getSettings } from '../actions'
import { io } from 'socket.io-client'

type Token = {
    id: number
    displayId: string
    status: string
    counterId: number
    service?: { name: string }
}

type Counter = {
    id: number
    name: string
}

export default function DisplayPage() {
    const [tokens, setTokens] = useState<Token[]>([])
    const [counters, setCounters] = useState<Counter[]>([])
    const [lastCalled, setLastCalled] = useState<string | null>(null)
    const [organizationName, setOrganizationName] = useState('easyTRACK QMS')

    const fetchData = async () => {
        const t = await getTokens()
        const c = await getCounters()
        const s = await getSettings()
        setTokens(t as any)
        setCounters(c)

        const org = s.find((x: any) => x.id === 'organization_name')
        if (org) setOrganizationName(org.value)
    }

    useEffect(() => {
        fetchData()
        const socket = io()
        socket.on('queue_updated', fetchData)
        socket.on('token_called', (token: Token) => {
            setLastCalled(token.displayId)
            const audio = new Audio('/chime.mp3')
            audio.play().catch(e => console.error("Audio Play Error:", e))
        })
        return () => { socket.disconnect() }
    }, [])

    // Refresh every 1 minute to ensure sync
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData() // Re-fetch data every minute
            // window.location.reload() // Or full reload if preferred
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (lastCalled) {
            const timer = setTimeout(() => setLastCalled(null), 10000)
            return () => clearTimeout(timer)
        }
    }, [lastCalled])

    // Get currently serving tokens map
    const servingTokens = tokens.filter(t => t.status === 'SERVING')

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden" suppressHydrationWarning>
            {/* Left Area: Video Advertisement (70%) */}
            <div className="w-[70%] bg-black relative flex items-center justify-center" suppressHydrationWarning>
                <video
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-contain"
                    // Placeholder video if file missing
                    poster="/placeholder.png"
                >
                    <source src="/promo.mp4" type="video/mp4" />
                    {/* Fallback text if video fails */}
                    <div className="text-white text-center p-10" suppressHydrationWarning>
                        <h1 className="text-4xl font-bold mb-4">{organizationName}</h1>
                        <p className="text-xl">Welcome to our facility</p>
                    </div>
                </video>
            </div>

            {/* Right Sidebar: Status List (30%) */}
            <div className="w-[30%] bg-zinc-900 border-l border-zinc-800 flex flex-col" suppressHydrationWarning>
                <div className="p-6 bg-zinc-950 border-b border-zinc-800" suppressHydrationWarning>
                    <h1 className="text-2xl font-bold text-center text-white uppercase tracking-widest animate-blink-green">
                        Now Serving
                    </h1>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4" suppressHydrationWarning>
                    {counters.map(counter => {
                        const activeToken = servingTokens.find(t => t.counterId === counter.id)
                        const isFlashing = activeToken?.displayId === lastCalled

                        return (
                            <div
                                key={counter.id}
                                className={`
                                    rounded-xl p-6 border-l-8 shadow-xl transition-all duration-500
                                    ${activeToken ? 'bg-zinc-800 text-white border-[#8DC63F]' : 'bg-zinc-950 text-zinc-700 border-zinc-800'}
                                    ${isFlashing ? 'animate-pulse ring-4 ring-[#8DC63F] scale-105 z-10' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-lg opacity-80">{counter.name}</span>
                                    {activeToken && (
                                        <span className="text-xs font-bold px-2 py-1 bg-[#8DC63F] text-white rounded">
                                            {activeToken.service?.name}
                                        </span>
                                    )}
                                </div>

                                <div className="text-center">
                                    {activeToken ? (
                                        <div className="text-6xl font-black tabular-nums tracking-tight">
                                            {activeToken.displayId}
                                        </div>
                                    ) : (
                                        <div className="text-4xl font-light opacity-30">---</div>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {counters.length === 0 && (
                        <div className="text-center text-zinc-500 mt-10" suppressHydrationWarning>
                            No counters configured.
                        </div>
                    )}
                </div>

                <div className="p-4 bg-black/20 text-white/50 text-center text-sm" suppressHydrationWarning>
                    Please wait for your number based on Service Category.
                </div>
            </div>
        </div>
    )
}
