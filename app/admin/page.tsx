'use client'

import { createService, getServices, getCounters, createCounter, assignServiceToCounter, getSettings, updateSetting, getAnalytics, getReports, getSession, createUser, deleteUser, getUsers, logout, updateService, updateCounter, getPrinters, deleteService } from '../actions'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    Settings,
    FileText,
    Layers,
    Monitor,
    LogOut,
    Menu,
    X,
    Plus,
    Trash2,
    Printer,
    Search,
    Pencil,
    RefreshCw
} from 'lucide-react'

export default function AdminPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('analytics')
    const [services, setServices] = useState<any[]>([])
    const [counters, setCounters] = useState<any[]>([])
    const [settings, setSettings] = useState<any[]>([])
    const [analytics, setAnalytics] = useState<any>(null)
    const [currentUser, setCurrentUser] = useState<string>('')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [editingService, setEditingService] = useState<any>(null)
    const [editingCounter, setEditingCounter] = useState<any>(null)
    const [isPending, startTransition] = useTransition()

    // Auth Check
    useEffect(() => {
        getSession().then(session => {
            if (!session || session.role !== 'ADMIN') {
                router.push('/login')
            } else {
                setCurrentUser(session.username)
            }
        })
    }, [])

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

    const handleUpdateService = () => {
        if (!editingService) return
        startTransition(async () => {
            await updateService(editingService.id, editingService)
            setEditingService(null)
            refreshData()
        })
    }

    const handleDeleteService = (id: number) => {
        if (!confirm('Are you sure you want to delete this service?')) return
        startTransition(async () => {
            await deleteService(id)
            refreshData()
        })
    }

    const handleUpdateCounter = () => {
        if (!editingCounter) return
        startTransition(async () => {
            await updateCounter(editingCounter.id, editingCounter)
            setEditingCounter(null)
            refreshData()
        })
    }

    // Forms
    const [newService, setNewService] = useState({ name: '', prefix: '', startNumber: 100 })
    const [newCounter, setNewCounter] = useState({ name: '' })
    const [smsKey, setSmsKey] = useState('')
    const [twilioSid, setTwilioSid] = useState('')
    const [twilioToken, setTwilioToken] = useState('')
    const [twilioFrom, setTwilioFrom] = useState('')
    const [smsTemplate, setSmsTemplate] = useState('Your Token Number is: {{TOKEN}}. Please wait for your turn.')
    const [branchName, setBranchName] = useState('')
    const [organizationName, setOrganizationName] = useState('Dove Medical Centre')
    const [targetPrinter, setTargetPrinter] = useState('')
    const [availablePrinters, setAvailablePrinters] = useState<string[]>([])

    // Reports State
    const [reportData, setReportData] = useState<any[]>([])
    const [reportFilters, setReportFilters] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        serviceId: 'all',
        status: 'all'
    })

    const refreshData = () => {
        getServices().then(setServices)
        getCounters().then(setCounters)
        getAnalytics().then(setAnalytics)
        getSettings().then(s => {
            setSettings(s)
            const key = s.find((x: any) => x.id === 'sms_api_key')
            if (key) setSmsKey(key.value)

            const sid = s.find((x: any) => x.id === 'twilio_sid')
            if (sid) setTwilioSid(sid.value)

            const token = s.find((x: any) => x.id === 'twilio_token')
            if (token) setTwilioToken(token.value)

            const from = s.find((x: any) => x.id === 'twilio_from')
            if (from) setTwilioFrom(from.value)

            const template = s.find((x: any) => x.id === 'sms_template')
            if (template) setSmsTemplate(template.value)

            const branch = s.find((x: any) => x.id === 'branch_name')
            if (branch) setBranchName(branch.value)

            const org = s.find((x: any) => x.id === 'organization_name')
            if (org) setOrganizationName(org.value)

            const printer = s.find((x: any) => x.id === 'target_printer')
            if (printer) setTargetPrinter(printer.value)
        })
        getPrinters().then(p => setAvailablePrinters(p as string[]))
    }

    useEffect(() => { refreshData() }, [])

    const handleCreateService = () => {
        startTransition(async () => {
            await createService(newService)
            setNewService({ name: '', prefix: '', startNumber: 100 })
            refreshData()
        })
    }

    const handleCreateCounter = () => {
        startTransition(async () => {
            await createCounter(newCounter)
            setNewCounter({ name: '' })
            refreshData()
        })
    }

    const handleSaveSettings = () => {
        startTransition(async () => {
            await updateSetting('sms_api_key', smsKey)
            await updateSetting('twilio_sid', twilioSid)
            await updateSetting('twilio_token', twilioToken)
            await updateSetting('twilio_from', twilioFrom)
            await updateSetting('sms_template', smsTemplate)
            await updateSetting('branch_name', branchName)
            await updateSetting('organization_name', organizationName)
            await updateSetting('target_printer', targetPrinter)
            alert('Settings Saved')
            refreshData()
        })
    }

    const handleAssign = (counterId: number, serviceId: string) => {
        if (!serviceId) return
        startTransition(async () => {
            await assignServiceToCounter(counterId, parseInt(serviceId))
            refreshData()
        })
    }

    const handleGenerateReport = async () => {
        startTransition(async () => {
            const data = await getReports(reportFilters)
            setReportData(data)
        })
    }

    const handlePrintReport = () => {
        window.print()
    }

    const NavItem = ({ id, icon: Icon, label }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === id
                ? 'bg-[#8DC63F] text-white shadow-lg shadow-[#8DC63F]/20 font-bold'
                : 'text-zinc-400 hover:bg-[#717074] hover:text-white'
                }`}
        >
            <Icon size={20} />
            <span className={`font-medium ${!sidebarOpen && 'hidden md:hidden'}`}>{label}</span>
        </button>
    )

    return (
        <div className="min-h-screen bg-zinc-50 flex font-sans" suppressHydrationWarning>
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #report-section, #report-section * { visibility: visible; }
                    #report-section { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#717074] min-h-screen flex flex-col transition-all duration-300 fixed z-50 print:hidden`}>
                <div className="p-6 flex items-center justify-between">
                    <div className={`font-bold text-white text-xl flex items-center gap-2 ${!sidebarOpen && 'hidden'}`}>
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">Q</div>
                        easyTRACK QMS
                    </div>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-zinc-400 hover:text-white">
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <NavItem id="analytics" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem id="services" icon={Layers} label="Services" />
                    <NavItem id="counters" icon={Monitor} label="Counters" />
                    <NavItem id="users" icon={Users} label="Users" />
                    <NavItem id="reports" icon={FileText} label="Reports" />
                    <NavItem id="settings" icon={Settings} label="Settings" />
                </nav>

                <div className="p-4 border-t border-zinc-700">
                    <div className={`flex items-center gap-3 mb-4 px-2 ${!sidebarOpen && 'justify-center'}`}>
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold text-xs">
                            {currentUser.substring(0, 2).toUpperCase()}
                        </div>
                        {sidebarOpen && (
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-white truncate">{currentUser}</p>
                                <p className="text-xs text-zinc-500">Administrator</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-2 text-red-200 hover:bg-white/10 hover:text-white p-2 rounded-lg transition-colors ${!sidebarOpen && 'justify-center'}`}
                    >
                        <LogOut size={18} />
                        {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'} p-8`}>
                <header className="mb-8 flex justify-between items-center print:hidden">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-800 capitalize">{activeTab}</h1>
                        <p className="text-zinc-500 text-sm">Manage your queue system</p>
                    </div>
                    <div className="text-sm text-zinc-500 bg-white px-4 py-2 rounded-full shadow-sm border">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </header>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'users' && <UsersTab />}

                    {activeTab === 'services' && (
                        <div className="space-y-6">
                            {/* Card: Add Service */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Plus size={20} className="text-[#8DC63F]" />
                                    Add New Service
                                </h2>
                                <div className="flex flex-wrap gap-4 items-end">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Service Name</label>
                                        <input value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} className="w-full border p-3 rounded-lg bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-[#8DC63F] transition-all outline-none" placeholder="e.g. Dental" />
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Prefix</label>
                                        <input value={newService.prefix} onChange={e => setNewService({ ...newService, prefix: e.target.value.toUpperCase() })} className="w-full border p-3 rounded-lg bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-lime-500 transition-all outline-none" placeholder="D" maxLength={3} />
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Start No.</label>
                                        <input type="number" value={newService.startNumber} onChange={e => setNewService({ ...newService, startNumber: parseInt(e.target.value) })} className="w-full border p-3 rounded-lg bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-lime-500 transition-all outline-none" />
                                    </div>
                                    <button disabled={isPending} onClick={handleCreateService} className="bg-[#717074] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#5a595d] shadow-lg shadow-zinc-200 transition-all">
                                        Create
                                    </button>
                                </div>
                            </div>

                            {/* Card: List Services */}
                            <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
                                <div className="p-6 border-b border-zinc-50">
                                    <h2 className="text-lg font-bold">Existing Services</h2>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4">Name</th>
                                            <th className="p-4">Prefix</th>
                                            <th className="p-4">Starts At</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {services.map(s => (
                                            <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                                                <td className="p-4 font-semibold text-zinc-700">
                                                    {editingService?.id === s.id ? (
                                                        <input value={editingService.name} onChange={e => setEditingService({ ...editingService, name: e.target.value })} className="border p-1 rounded w-full" autoFocus />
                                                    ) : s.name}
                                                </td>
                                                <td className="p-4">
                                                    {editingService?.id === s.id ? (
                                                        <input value={editingService.prefix} onChange={e => setEditingService({ ...editingService, prefix: e.target.value })} className="border p-1 rounded w-16 uppercase" />
                                                    ) : <span className="bg-zinc-100 px-3 py-1 rounded-full font-mono text-sm border font-bold text-zinc-600">{s.prefix}</span>}
                                                </td>
                                                <td className="p-4 text-zinc-500">
                                                    {editingService?.id === s.id ? (
                                                        <input type="number" value={editingService.startNumber} onChange={e => setEditingService({ ...editingService, startNumber: parseInt(e.target.value) })} className="border p-1 rounded w-20" />
                                                    ) : s.startNumber}
                                                </td>
                                                <td className="p-4"><span className="text-[#8DC63F] bg-[#8DC63F]/20 px-2 py-1 rounded text-xs font-bold">Active</span></td>
                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    {editingService?.id === s.id ? (
                                                        <>
                                                            <button onClick={handleUpdateService} className="text-green-600 hover:bg-green-50 p-2 rounded">Save</button>
                                                            <button onClick={() => setEditingService(null)} className="text-zinc-400 hover:bg-zinc-100 p-2 rounded">Cancel</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => setEditingService(s)} className="text-zinc-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                                                                <Pencil size={18} />
                                                            </button>
                                                            <button onClick={() => handleDeleteService(s.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors" title="Delete Service">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'counters' && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Plus size={20} className="text-[#8DC63F]" />
                                    Add New Counter
                                </h2>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1 max-w-md">
                                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Counter Name</label>
                                        <input value={newCounter.name} onChange={e => setNewCounter({ ...newCounter, name: e.target.value })} className="w-full border p-3 rounded-lg bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-lime-500 transition-all outline-none" placeholder="e.g. Counter 3" />
                                    </div>
                                    <button disabled={isPending} onClick={handleCreateCounter} className="bg-[#717074] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#5a595d] shadow-lg shadow-zinc-200 transition-all">
                                        Create
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {counters.map(c => (
                                    <div key={c.id} className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-[#8DC63F]/10 rounded-full flex items-center justify-center text-[#8DC63F]">
                                                <Monitor size={24} />
                                            </div>
                                            <div className="flex gap-1">
                                                {editingCounter?.id === c.id ? (
                                                    <button onClick={handleUpdateCounter} className="text-xs font-bold text-[#8DC63F] bg-[#8DC63F]/10 px-2 py-1 rounded">Save</button>
                                                ) : (
                                                    <button onClick={() => setEditingCounter(c)} className="text-zinc-400 hover:bg-zinc-100 p-1 rounded"><Pencil size={16} /></button>
                                                )}
                                                <span className="text-xs font-bold bg-zinc-100 text-zinc-500 px-2 py-1 rounded flex items-center">ID: {c.id}</span>
                                            </div>
                                        </div>

                                        {editingCounter?.id === c.id ? (
                                            <input value={editingCounter.name} onChange={e => setEditingCounter({ ...editingCounter, name: e.target.value })} className="border p-2 rounded w-full mb-2 font-bold text-lg" autoFocus />
                                        ) : (
                                            <h3 className="font-bold text-lg mb-2 text-[#717074]">{c.name}</h3>
                                        )}

                                        <div className="mb-6 text-sm text-zinc-500 h-10 overflow-hidden leading-tight">
                                            {c.services?.map((s: any) => s.name).join(', ') || 'No services assigned'}
                                        </div>
                                        <div className="pt-4 border-t border-zinc-50">
                                            <select onChange={(e) => handleAssign(c.id, e.target.value)} className="w-full bg-zinc-50 p-2 rounded text-sm border-none focus:ring-2 focus:ring-[#8DC63F] cursor-pointer text-zinc-700">
                                                <option value="">+ Assign Service...</option>
                                                {services.filter(s => !c.services?.find((x: any) => x.id === s.id)).map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-zinc-100">
                                <h2 className="text-xl font-bold mb-6 pb-4 border-b">Printer Configuration</h2>
                                <div>
                                    <label className="block text-sm font-bold text-zinc-700 mb-2">Target Printer for Kiosk</label>
                                    <div className="flex gap-2">
                                        <select value={targetPrinter} onChange={e => setTargetPrinter(e.target.value)} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#8DC63F] outline-none bg-white">
                                            <option value="">Default System Printer</option>
                                            {availablePrinters.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        <button onClick={() => getPrinters().then(p => setAvailablePrinters(p as string[]))} className="p-3 border rounded-lg hover:bg-zinc-50">
                                            <RefreshCw size={20} className="text-zinc-500" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-2">Select the USB thermal printer here. Note: Backend requires permission to change default printer.</p>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-xl shadow-sm border border-zinc-100">
                                <h2 className="text-xl font-bold mb-6 pb-4 border-b">Organization & Branding</h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 mb-2">Organization Name</label>
                                        <input value={organizationName} onChange={e => setOrganizationName(e.target.value)} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#8DC63F] outline-none" placeholder="e.g. Dr. Haifa Hospital" />
                                        <p className="text-xs text-zinc-400 mt-2">Appears on all displays and reports.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 mb-2">Branch Name</label>
                                        <input value={branchName} onChange={e => setBranchName(e.target.value)} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none" placeholder="e.g. City Center Branch" />
                                        <p className="text-xs text-zinc-400 mt-2">Printed on physical tickets.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-xl shadow-sm border border-zinc-100">
                                <h2 className="text-xl font-bold mb-6 pb-4 border-b">Integrations</h2>
                                <div>
                                    <label className="block text-sm font-bold text-zinc-700 mb-2">Twilio Sandbox Configuration</label>
                                    <div className="space-y-4">
                                        <div>
                                            <input value={twilioSid} onChange={e => setTwilioSid(e.target.value)} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none" placeholder="Account SID (e.g. AC...)" />
                                        </div>
                                        <div>
                                            <input type="password" value={twilioToken} onChange={e => setTwilioToken(e.target.value)} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none" placeholder="Auth Token" />
                                        </div>
                                        <div>
                                            <input value={twilioFrom} onChange={e => setTwilioFrom(e.target.value)} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none" placeholder="From Number (e.g. +14155238886)" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-2">Get these from your Twilio Console &gt; Home directly.</p>

                                    <div className="mt-6">
                                        <label className="block text-sm font-bold text-zinc-700 mb-2">SMS Message Template</label>
                                        <textarea
                                            value={smsTemplate}
                                            onChange={e => setSmsTemplate(e.target.value)}
                                            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none h-24 font-mono text-sm"
                                            placeholder="Your Token Number is: {{TOKEN}}. Please wait for your turn."
                                        />
                                        <p className="text-xs text-zinc-400 mt-2">
                                            Available Placeholders: <code className="bg-zinc-100 px-1 rounded">{'{{TOKEN}}'}</code>, <code className="bg-zinc-100 px-1 rounded">{'{{SERVICE}}'}</code>, <code className="bg-zinc-100 px-1 rounded">{'{{ORG}}'}</code>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button disabled={isPending} onClick={handleSaveSettings} className="bg-[#717074] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#5a595d] shadow-xl transition-all">
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && analytics && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Total Today', value: analytics.totalToday || 0, color: 'text-zinc-800', bg: 'bg-zinc-50' },
                                    { label: 'Completed', value: analytics.completedToday || 0, color: 'text-[#8DC63F]', bg: 'bg-[#8DC63F]/10' },
                                    { label: 'Serving Now', value: analytics.servingNow || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                                    { label: 'Waiting', value: analytics.waiting || 0, color: 'text-zinc-500', bg: 'bg-zinc-100' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col justify-between h-32">
                                        <div className={`text-xs font-bold uppercase tracking-wider ${stat.color}`}>{stat.label}</div>
                                        <div className={`text-5xl font-black ${stat.color}`}>{stat.value}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
                                <h2 className="text-lg font-bold mb-6">Volume by Service</h2>
                                <div className="h-64 flex items-end gap-6 border-b border-zinc-100 pb-2">
                                    {analytics.serviceStats?.map((s: any) => (
                                        <div key={s.name} className="flex-1 flex flex-col items-center group">
                                            <div className="w-full max-w-[60px] bg-[#8DC63F]/20 rounded-t-xl relative group-hover:bg-[#8DC63F]/40 transition-all flex items-end justify-center overflow-hidden"
                                                style={{ height: `${Math.max((s.count / (analytics.totalToday || 1)) * 200, 20)}px` }}>
                                                <div className="bg-[#8DC63F] w-full h-1 bottom-0 absolute"></div>
                                                <span className="mb-2 font-bold text-zinc-800 opactiy-0 group-hover:opacity-100 transition-opacity">{s.count}</span>
                                            </div>
                                            <span className="mt-3 text-xs font-bold text-zinc-500 rotate-0 truncate w-full text-center">{s.name}</span>
                                        </div>
                                    ))}
                                    {(!analytics.serviceStats || analytics.serviceStats.length === 0) && <p className="text-zinc-300 w-full text-center">No data available</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
                            <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 grid grid-cols-1 md:grid-cols-5 gap-4 items-end print:hidden mb-8">
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase text-zinc-500">Start Date</label>
                                    <input type="date" value={reportFilters.startDate} onChange={e => setReportFilters({ ...reportFilters, startDate: e.target.value })} className="border p-2 rounded w-full bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase text-zinc-500">End Date</label>
                                    <input type="date" value={reportFilters.endDate} onChange={e => setReportFilters({ ...reportFilters, endDate: e.target.value })} className="border p-2 rounded w-full bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase text-zinc-500">Service</label>
                                    <select value={reportFilters.serviceId} onChange={e => setReportFilters({ ...reportFilters, serviceId: e.target.value })} className="border p-2 rounded w-full bg-white">
                                        <option value="all">All Services</option>
                                        {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase text-zinc-500">Status</label>
                                    <select value={reportFilters.status} onChange={e => setReportFilters({ ...reportFilters, status: e.target.value })} className="border p-2 rounded w-full bg-white">
                                        <option value="all">All Statuses</option>
                                        <option value="WAITING">Waiting</option>
                                        <option value="SERVING">Serving</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="SKIPPED">Skipped</option>
                                    </select>
                                </div>
                                <button onClick={handleGenerateReport} disabled={isPending} className="bg-zinc-700 text-white font-bold py-2 px-4 rounded hover:bg-zinc-600 flex items-center justify-center gap-2">
                                    <Search size={16} /> Generate
                                </button>
                            </div>

                            {reportData.length > 0 ? (
                                <div id="report-section">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            {/* Logo for Print */}
                                            <img src="/logo.png" alt="Logo" className="h-16 mb-4 hidden print:block object-contain" />
                                            <h2 className="text-xl font-bold text-zinc-800">Queue Data Report</h2>
                                            <p className="text-sm text-zinc-500 mt-1">Generated on {new Date().toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={handlePrintReport} className="bg-zinc-700 text-white px-4 py-2 rounded-lg hover:bg-zinc-600 print:hidden flex items-center gap-2 shadow-lg">
                                            <Printer size={16} /> Print / PDF
                                        </button>
                                    </div>
                                    <div className="overflow-hidden border rounded-lg">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-xs tracking-wider">
                                                <tr>
                                                    <th className="p-4">Time</th>
                                                    <th className="p-4">Token</th>
                                                    <th className="p-4">Service</th>
                                                    <th className="p-4">Counter</th>
                                                    <th className="p-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100">
                                                {reportData.map((row: any) => (
                                                    <tr key={row.id} className="hover:bg-zinc-50">
                                                        <td className="p-4 text-zinc-500">{new Date(row.createdAt).toLocaleTimeString()} <span className="text-xs text-zinc-400">({new Date(row.createdAt).toLocaleDateString()})</span></td>
                                                        <td className="p-4"><span className="font-mono font-bold bg-zinc-100 px-2 py-1 rounded text-zinc-800">{row.displayId}</span></td>
                                                        <td className="p-4 font-medium">{row.service?.name}</td>
                                                        <td className="p-4 text-zinc-500">{row.counter?.name || '-'}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold 
                                                            ${row.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                                    row.status === 'SERVING' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-zinc-100 text-zinc-600'}`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-12 text-zinc-400">
                                    <div className="inline-block p-4 bg-zinc-50 rounded-full mb-4"><FileText size={32} /></div>
                                    <p>No records found. Adjust filters to see data.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

function UsersTab() {
    const [users, setUsers] = useState<any[]>([])
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'STAFF' })
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        getUsers().then(setUsers).catch(console.error)
    }, [])

    const handleCreate = () => {
        if (!newUser.username || !newUser.password) return

        startTransition(async () => {
            try {
                await createUser(newUser)
                setNewUser({ username: '', password: '', role: 'STAFF' })
                getUsers().then(setUsers)
                alert("User saved successfully")
            } catch (e: any) {
                alert(e.message)
            }
        })
    }

    const handleDelete = (id: number) => {
        if (!confirm("Are you sure?")) return
        startTransition(async () => {
            try {
                await deleteUser(id)
                getUsers().then(setUsers).catch(console.error)
            } catch (e: any) {
                alert("Error: " + e.message)
            }
        })
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Plus size={20} className="text-zinc-800" />
                    Manage Users
                </h2>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Username</label>
                        <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="w-full border p-3 rounded-lg bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-500 transition-all outline-none" placeholder="e.g. nurse1" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Password</label>
                        <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full border p-3 rounded-lg bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-500 transition-all outline-none" placeholder="*****" />
                    </div>
                    <div className="w-48">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Role</label>
                        <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full border p-3 rounded-lg bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-500 transition-all outline-none">
                            <option value="STAFF">STAFF</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={isPending || !newUser.username || !newUser.password}
                        className="bg-zinc-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-zinc-600 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Saving...' : '+ Add / Update'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4">Username</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Created Date</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="p-4 font-bold text-zinc-800">{u.username}</td>
                                <td className="p-4"><span className={`text-xs font-bold px-2 py-1 rounded ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-[#8DC63F]/20 text-[#8DC63F]'}`}>{u.role}</span></td>
                                <td className="p-4 text-zinc-500 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="p-4 text-right">
                                    {u.username !== 'admin' && (
                                        <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
