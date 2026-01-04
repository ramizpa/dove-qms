'use client'

import { createToken, getServices, getSettings, printLastToken } from '../actions'
import { useState, useTransition, useEffect } from 'react'
import { io } from 'socket.io-client'
import { cn } from '@/lib/utils'
import { Receipt, MessageSquareText, ChevronLeft, Delete, Settings } from 'lucide-react'
import { login } from '../actions' // For admin check

type Service = {
    id: number
    name: string
    prefix: string
    description: string | null
    waitTime?: number // AI Feature
}

export default function KioskPage() {
    const [isPending, startTransition] = useTransition()
    const [lastToken, setLastToken] = useState<string | null>(null)
    const [lastService, setLastService] = useState<string | null>(null)
    const [printTime, setPrintTime] = useState<string | null>(null)
    const [branchName, setBranchName] = useState<string>('City Center Branch')
    const [organizationName, setOrganizationName] = useState<string>('Dr. Haifa Hospital')
    const [services, setServices] = useState<Service[]>([])
    const [selectedService, setSelectedService] = useState<number | null>(null)
    const [isPriority, setIsPriority] = useState(false)

    // SMS State
    const [showSmsInput, setShowSmsInput] = useState(false)
    const [phoneNumber, setPhoneNumber] = useState('')

    // Settings State
    const [showSettings, setShowSettings] = useState(false)
    const [adminPassword, setAdminPassword] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [printers, setPrinters] = useState<string[]>([])
    const [selectedPrinter, setSelectedPrinter] = useState('')

    // Load saved printer
    useEffect(() => {
        const saved = localStorage.getItem('kiosk_printer_name')
        if (saved) setSelectedPrinter(saved)
    }, [])

    const handleSettingsOpen = () => {
        setShowSettings(true)
        setIsAuthenticated(false)
        setAdminPassword('')
        setPrinters([])
    }

    const handleAdminLogin = async () => {
        // We assume 'admin' username is standard, or just check password validity via login action
        // Actually login action needs username. Let's assume 'admin'.
        // Or simpler: We just accept ANY valid login that has role ADMIN?
        // Let's try 'admin' user.
        const res = await login('admin', adminPassword)
        if (res.success) {
            setIsAuthenticated(true)
            fetchLocalPrinters()
        } else {
            alert("Invalid Password")
        }
    }

    const fetchLocalPrinters = async () => {
        try {
            const res = await fetch('http://localhost:8080/printers')
            if (res.ok) {
                const list = await res.json()
                setPrinters(list)
            } else {
                alert("Could not connect to Print Agent. Is it running?")
            }
        } catch (e) {
            alert("Could not connect to Print Agent on http://localhost:8080. Make sure 'start_agent.bat' is running.")
        }
    }

    const savePrinter = () => {
        localStorage.setItem('kiosk_printer_name', selectedPrinter)
        setShowSettings(false)
    }

    const printLocally = async (htmlContent: string) => {
        try {
            await fetch('http://localhost:8080/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: htmlContent, printerName: selectedPrinter })
            })
        } catch (e) {
            console.error("Local Print Failed", e)
            alert("Local Print Failed. Check Agent.")
        }
    }

    const fetchData = () => {
        getServices().then(data => {
            setServices(data)
            if (data.length === 1) setSelectedService(data[0].id)
        })
        getSettings().then(s => {
            const b = s.find((x: any) => x.id === 'branch_name')
            if (b) setBranchName(b.value)

            const org = s.find((x: any) => x.id === 'organization_name')
            if (org) setOrganizationName(org.value)
        })
    }

    // Initial Load + Socket + Polling
    // Initial Load + Socket + Polling
    useEffect(() => {
        fetchData()

        // Poll every 10 seconds as backup
        const interval = setInterval(fetchData, 10000)

        // Real-time updates
        const socket = io()
        socket.on('connect', () => console.log("Kiosk: Connected to Socket"))
        socket.on('queue_updated', () => {
            console.log("Kiosk: Queue updated, refreshing...")
            fetchData()
        })
        socket.on('config_updated', fetchData)

        return () => {
            clearInterval(interval)
            socket.disconnect()
        }
    }, [])

    // Inactivity Reset
    useEffect(() => {
        if ((!selectedService && !showSmsInput) || services.length <= 1) return

        const timer = setTimeout(() => {
            handleReset()
        }, 60000)

        return () => clearTimeout(timer)
    }, [selectedService, showSmsInput, phoneNumber]) // Reset on interaction pause

    const handleCreate = (type: string) => {
        if (!selectedService) {
            alert("Please select a service first")
            return
        }

        if (type === 'SMS') {
            setShowSmsInput(true)
            setPhoneNumber('')
            return
        }

        submitToken(type, '')
    }

    const submitToken = (type: string, phone: string) => {
        const serviceName = services.find(s => s.id === selectedService)?.name || ''
        setLastService(serviceName)
        setPrintTime(new Date().toLocaleString())

        startTransition(async () => {
            try {
                // Pass priority if toggle is ON (e.g. 5 for Priority Assistance)
                const p = isPriority ? 5 : 1
                const token = await createToken(selectedService!, type, phone, p)
                setLastToken(token.displayId)

                // Clear SMS UI
                setShowSmsInput(false)
                setPhoneNumber('')

                if (type === 'PRINT') {
                    // CHECK: Do we have a local printer configured?
                    const localPrinter = localStorage.getItem('kiosk_printer_name')

                    if (localPrinter === 'BROWSER_PRINT') {
                        // NATIVE BROWSER PRINT
                        // We rely on the hidden #print-section being updated.
                        // Wait 100ms for React to render the new token number into the DOM
                        setTimeout(() => {
                            window.print()
                        }, 500)
                    } else if (localPrinter) {
                        // LOCAL PRINT via Agent
                        // We need the HTML content. 
                        // Currently printLastToken does everything. 
                        // Let's fetch the template content... actually printLastToken is server-side.
                        // We need to construct the receipt HTML here or ask server for it.
                        // Ideally, we move `printLastToken` logic to return HTML instead of printing!

                        // Quick Fix: We reconstruct simple HTML here or use printLastToken as fallback?
                        // If we want consistent design, we should ask server for the HTML.
                        // But for now, let's keep it robust. If local printer is set, we prefer it.

                        // We construct the HTML manually using the FRESH data, not the stale invalid DOM
                        const now = new Date().toLocaleString()
                        const fullHtml = `
                            <html>
                            <head><style>
                                @page { size: 80mm auto; margin: 0; }
                                body { font-family: sans-serif; text-align: center; padding: 5px; margin: 0; width: 78mm; }
                                h1 { font-size: 1.2rem; font-weight: bold; text-transform: uppercase; margin: 5px 0; }
                                p { margin: 2px 0; }
                                .branch { font-size: 0.8rem; margin-bottom: 10px; }
                                hr { border: 1px dashed black; margin: 10px 0; }
                                .service { font-size: 1rem; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                                .token { font-size: 3.5rem; font-weight: 900; margin: 5px 0; }
                                .footer { font-size: 0.7rem; margin-bottom: 5px; }
                                .time { font-size: 9px; color: #555; }
                            </style></head>
                            <body>
                                <div style="margin-bottom: 5px;">
                                    <img src="http://localhost:3000/logo.png" alt="Logo" style="width: auto; height: 50px; max-width: 100%; object-fit: contain;" onerror="this.style.display='none'" />
                                </div>
                                <h1>${organizationName}</h1>
                                <p class="branch">${branchName}</p>
                                <hr />
                                <div class="service">${serviceName}</div>
                                <div class="token">${token.displayId}</div>
                                <p class="footer">Please wait, you will be served soon.</p>
                                <p class="time">${now}</p>
                            </body>
                            </html>
                        `
                        printLocally(fullHtml)
                    } else {
                        // FALLBACK: Server Print
                        printLastToken(token.displayId, serviceName, organizationName).catch(console.error)
                    }
                }
            } catch (e) {
                console.error(e)
                alert("Failed to create token")
            }
        })
    }

    const handleDigit = (d: string) => {
        if (phoneNumber.length < 8) setPhoneNumber(prev => prev + d)
    }

    const handleBackspace = () => {
        setPhoneNumber(prev => prev.slice(0, -1))
    }

    const handleSmsSubmit = () => {
        if (phoneNumber.length !== 8) {
            alert("Please enter a valid 8-digit mobile number")
            return
        }
        submitToken('SMS', '+973' + phoneNumber)
    }

    // Auto-clear success message
    useEffect(() => {
        if (lastToken) {
            const timer = setTimeout(handleReset, 5000)
            return () => clearTimeout(timer)
        }
    }, [lastToken, services.length])

    const handleReset = () => {
        setLastToken(null)
        setLastService(null)
        setShowSmsInput(false)
        setPhoneNumber('')
        setIsPriority(false)
        if (services.length > 1) setSelectedService(null)
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4 font-sans" suppressHydrationWarning>

            {/* Gear Icon */}
            <button onClick={handleSettingsOpen} className="fixed top-4 right-4 text-slate-300 hover:text-slate-500 z-50">
                <Settings size={24} />
            </button>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
                    <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between mb-4">
                            <h2 className="font-bold text-lg">Printer Settings</h2>
                            <button onClick={() => setShowSettings(false)}><Delete className="w-5 h-5" /></button>
                        </div>

                        {!isAuthenticated ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500">Enter Admin Password to configure kiosk printer.</p>
                                <input
                                    type="password"
                                    className="w-full border p-2 rounded"
                                    placeholder="Password"
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                />
                                <button onClick={handleAdminLogin} className="w-full bg-slate-800 text-white py-2 rounded font-bold">Unlock</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500">Select Local USB Printer:</p>
                                <select
                                    className="w-full border p-2 rounded"
                                    value={selectedPrinter}
                                    onChange={e => setSelectedPrinter(e.target.value)}
                                >
                                    <option value="">-- No Local Printer (Use Server) --</option>
                                    <option value="BROWSER_PRINT">-- System Default / Browser Print --</option>
                                    {printers.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <p className="text-xs text-slate-400">
                                    Note: Requires 'start_agent.bat' running on this PC.
                                </p>
                                <button onClick={savePrinter} className="w-full bg-[#8DC63F] text-white py-2 rounded font-bold">Save Configuration</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PRINT HEADER Area (Hidden on screen) */}
            <div id="print-section" className="flex-col items-center justify-start w-[78mm] mx-auto text-black bg-white pt-2 print:flex hidden" suppressHydrationWarning>
                <div className="mb-2 w-full flex justify-center">
                    <img src="/logo.png" alt="Logo" className="h-[50px] object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
                <h1 className="text-xl font-bold text-center uppercase mb-1">{organizationName}</h1>
                <p className="text-xs text-center mb-2">{branchName}</p>
                <hr className="w-full border-black mb-2 border-dashed" />
                <div className="text-center mb-4" suppressHydrationWarning>
                    <div className="text-lg font-bold uppercase mb-1 text-black">{lastService || 'General'}</div>
                    <div className="text-6xl font-black text-black my-2">{lastToken || '---'}</div>
                </div>
                <p className="text-xs text-center mb-1 text-black">Please wait, you will be served soon.</p>
                <p className="text-[10px] text-center text-slate-600">{printTime}</p>
            </div>

            <style jsx global>{`
        @media print {
            @page { size: 80mm auto; margin: 0; }
            body * { visibility: hidden; }
            #print-section, #print-section * { visibility: visible; }
            #print-section {
                visibility: visible !important;
                display: flex !important;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                position: absolute;
                left: 0; top: 0;
                width: 78mm;
                margin: 0;
                padding: 5px;
                background: white;
            }
             /* Start clean on a new page */
             html, body { margin: 0; padding: 0; width: 80mm; height: 100%; }
        }
      `}</style>


            {/* UI CONTAINER */}
            <div className="print:hidden w-full max-w-4xl flex flex-col items-center">

                {/* LOGO & HEADING */}
                <div className="mb-6" suppressHydrationWarning>
                    <img src="/logo.png" alt="Hospital Logo" className="h-32 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
                <h1 className="text-4xl font-bold mb-8 text-[#717074] text-center">Welcome to {organizationName}</h1>

                {/* VIEW: SUCCESS */}
                {lastToken ? (
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-300">
                        <div className="text-center p-12 bg-green-100 rounded-3xl border-4 border-green-500 shadow-2xl">
                            <p className="text-2xl text-green-800 font-semibold mb-2">Your Token Number</p>
                            <p className="text-9xl font-black text-green-900 my-4">{lastToken}</p>
                            <p className="mt-4 text-green-700 text-xl">Please have a seat</p>
                        </div>
                        <button onClick={handleReset} className="bg-[#717074] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-zinc-600 shadow-lg transition-transform hover:scale-105 active:scale-95">
                            Take Another Ticket
                        </button>
                        <p className="text-slate-400 text-sm">Screen will refresh in 5 seconds...</p>
                    </div>
                ) : showSmsInput ? (
                    /* VIEW: SMS INPUT */
                    <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-xl border border-zinc-100 animate-in slide-in-from-bottom-4">
                        <button onClick={() => setShowSmsInput(false)} className="mb-4 text-zinc-400 hover:text-zinc-600 flex items-center gap-1 font-bold">
                            <ChevronLeft size={20} /> Back
                        </button>

                        <h2 className="text-2xl font-bold text-center mb-6 text-[#717074]">Enter Mobile Number</h2>

                        <div className="flex items-center justify-center text-4xl font-mono font-bold mb-8 gap-2">
                            <span className="text-zinc-400">+973</span>
                            <div className={cn("border-b-2 min-w-[200px] text-center tracking-widest", phoneNumber ? "border-[#8DC63F] text-black" : "border-zinc-200 text-zinc-300")}>
                                {phoneNumber || 'XXXXXXXX'}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                <button key={n} onClick={() => handleDigit(n.toString())} className="h-16 rounded-xl bg-zinc-50 text-2xl font-bold text-[#717074] hover:bg-zinc-100 active:bg-zinc-200 transition-colors">
                                    {n}
                                </button>
                            ))}
                            <button onClick={() => handleDigit('0')} className="col-start-2 h-16 rounded-xl bg-zinc-50 text-2xl font-bold text-[#717074] hover:bg-zinc-100 active:bg-zinc-200 transition-colors">0</button>
                            <button onClick={handleBackspace} className="h-16 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 active:bg-red-200 transition-colors">
                                <Delete />
                            </button>
                        </div>

                        <button
                            onClick={handleSmsSubmit}
                            disabled={phoneNumber.length !== 8 || isPending}
                            className="w-full py-4 rounded-xl bg-[#8DC63F] text-white font-bold text-xl hover:bg-[#7cb335] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                        >
                            {isPending ? 'Sending...' : 'Get Token via SMS'}
                        </button>
                    </div>
                ) : (
                    /* VIEW: MAIN SELECTION */
                    <div className="w-full flex flex-col gap-8" suppressHydrationWarning>
                        {/* Service Selection */}
                        {services.length > 1 && (
                            <div className="space-y-4">
                                <h2 className="text-xl text-center text-[#717074]">Select Service</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {services.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSelectedService(s.id)}
                                            className={cn(
                                                "p-6 rounded-xl border-2 text-left transition-all",
                                                selectedService === s.id
                                                    ? "border-black bg-[#E9F5E9] ring-2 ring-black"
                                                    : "border shadow-sm bg-white hover:border-[#8DC63F]/50"
                                            )}
                                        >
                                            <div className="font-bold text-lg text-black">{s.name}</div>
                                            <div className="text-slate-500 text-sm">{s.description}</div>
                                            {(s.waitTime !== undefined && s.waitTime > 0) && (
                                                <div className="text-xs font-bold text-[#8DC63F] mt-2 flex items-center gap-1">
                                                    ⏱ Est. Wait: {s.waitTime} min
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Priority Toggle */}
                        <div className="flex justify-center">
                            <button
                                onClick={() => setIsPriority(!isPriority)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-md",
                                    isPriority
                                        ? "bg-purple-600 text-white ring-4 ring-purple-200"
                                        : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                <span className="text-xl">{isPriority ? '✓' : '○'}</span>
                                Senior Citizen / Priority Assistance
                            </button>
                        </div>

                        {/* Actions */}
                        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8 transition-opacity duration-500", !selectedService && "opacity-50 pointer-events-none")}>
                            <button
                                disabled={isPending || !selectedService}
                                onClick={() => handleCreate('PRINT')}
                                className="h-48 rounded-3xl bg-[#717074] hover:bg-[#5a595d] active:scale-95 transition-all text-white shadow-xl flex flex-col items-center justify-center gap-4 group"
                            >
                                <Receipt size={48} className="group-hover:scale-110 transition-transform" />
                                <span className="text-2xl font-bold">Print Ticket</span>
                            </button>

                            <button
                                disabled={isPending || !selectedService}
                                onClick={() => handleCreate('SMS')}
                                className="h-48 rounded-3xl bg-[#8DC63F] hover:bg-[#7cb335] active:scale-95 transition-all text-white shadow-xl flex flex-col items-center justify-center gap-4 group"
                            >
                                <MessageSquareText size={48} className="group-hover:scale-110 transition-transform" />
                                <span className="text-2xl font-bold">SMS Token</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
