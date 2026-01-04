'use client'

import { useState, useTransition } from 'react'
import { login } from '../actions'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        startTransition(async () => {
            const result = await login(username, password)
            if (result.success) {
                router.push(result.role === 'ADMIN' ? '/admin' : '/counter')
            } else {
                setError('Invalid credentials')
            }
        })
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#8DC63F] p-4 font-sans" suppressHydrationWarning>
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl" suppressHydrationWarning>
                <div className="text-center mb-8">
                    <img src="/logo.png" className="h-20 mx-auto mb-4 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    <h1 className="text-2xl font-bold text-zinc-700">easyTRACK QMS</h1>
                    <p className="text-slate-500">Sign in to your account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8DC63F] outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8DC63F] outline-none transition"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-[#717074] text-white p-3 rounded-lg font-bold hover:bg-[#5a595d] transition disabled:opacity-50"
                    >
                        {isPending ? 'Verifying...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    )
}
