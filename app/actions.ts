'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// --- Services ---
export async function getServices() {
    const services = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
    })

    // AI: Enrich with Wait Times
    const enriched = await Promise.all(services.map(async (s: any) => {
        const waitTime = await getPredictedWaitTime(s.id)
        return { ...s, waitTime }
    }))

    return enriched
}

// --- Tokens ---

export async function createToken(serviceId: number, type: string = 'PRINT', phone?: string, priority: number = 1) {
    // 1. Get Service details
    const service = await prisma.service.findUnique({
        where: { id: serviceId }
    })

    if (!service) throw new Error("Service not found")

    // Intelligent Routing: Auto-VIP
    // If the service name itself says "VIP", force high priority
    if (service.name.toUpperCase().includes('VIP')) {
        priority = 10
    }

    // 2. Increment Service number safely
    // Ideally use a transaction or atomic increment, but for SQLite simple logic:

    // We want the *next* number. 
    // We can track currentNumber on Service model, or just Count tokens.
    // Let's use count for today or a sequence field. 
    // For this v1, let's just count tokens for this service created today + startNumber?
    // No, simpler to just add a 'currentNumber' field to Service or track it.
    // Actually, let's just use Prisma's atomic increment on a new field 'currentNumber' in Service if we had it.
    // Since we didn't add 'currentNumber' to Service schema yet (I missed adding it in the tool call previously, I only added startNumber),
    // let's rely on `count` for now or better, update the Service schema first? 
    // No, I can't update schema again easily without stopping server.
    // Let's use a count of tokens for this service today + startNumber.

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const countToday = await prisma.token.count({
        where: {
            serviceId,
            createdAt: { gte: today }
        }
    })

    const nextNumber = service.startNumber + countToday
    const displayId = `${service.prefix}-${nextNumber}`

    const token = await prisma.token.create({
        data: {
            number: nextNumber,
            displayId,
            type,
            phone,
            status: 'WAITING',
            serviceId,
            priority
        }
    })

    // 3. Stub SMS Integration
    // 3. SMS Integration (Twilio)
    if (type === 'SMS' && phone) {
        const settings = await prisma.setting.findMany()
        const sid = settings.find((s: any) => s.id === 'twilio_sid')?.value
        const token = settings.find((s: any) => s.id === 'twilio_token')?.value
        const from = settings.find((s: any) => s.id === 'twilio_from')?.value

        // Template Logic
        let msgBody = settings.find((s: any) => s.id === 'sms_template')?.value || 'Your Token Number is: {{TOKEN}}. Please wait for your turn.'
        const orgName = settings.find((s: any) => s.id === 'organization_name')?.value || 'Dove QMS'

        msgBody = msgBody.replace('{{TOKEN}}', displayId)
        msgBody = msgBody.replace('{{SERVICE}}', service.name)
        msgBody = msgBody.replace('{{ORG}}', orgName)

        if (sid && token && from) {
            console.log(`[Twilio] Sending token ${displayId} to ${phone}...`)
            try {
                const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
                const auth = Buffer.from(`${sid}:${token}`).toString('base64')
                const body = new URLSearchParams({
                    'To': phone,
                    'From': from,
                    'Body': msgBody
                })

                await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: body
                })
                    .then(async res => {
                        const text = await res.text()
                        if (!res.ok) console.error("[Twilio-Error]", text)
                        else console.log("[Twilio-Success]", "Message Queued")
                    })
            } catch (e) {
                console.error("[Twilio-Fail]", e)
            }
        } else {
            console.warn("[Twilio] Missing credentials. Message skipped.")
        }
    }

    const io = (global as any).io;
    if (io) {
        io.emit('queue_updated');
    }

    revalidatePath('/display')
    revalidatePath('/counter')
    return token
}

export async function getTokens(status?: string, serviceId?: number) {
    return await prisma.token.findMany({
        where: {
            ...(status ? { status } : {}),
            ...(serviceId ? { serviceId } : {})
        },
        include: { service: true }, // Include prefix info
        orderBy: [
            { priority: 'desc' }, // Intelligent Routing: High priority first
            { createdAt: 'asc' }
        ]
    })
}

export async function updateTokenStatus(id: number, status: string, counterId?: number) {
    const data: any = { status, counterId }

    // AI: Track Durations
    if (status === 'SERVING') {
        data.startedAt = new Date()
    } else if (status === 'COMPLETED') {
        data.completedAt = new Date()
    }

    const updated = await prisma.token.update({
        where: { id },
        data,
        include: { service: true }
    })

    const io = (global as any).io;
    if (io) {
        io.emit('queue_updated');
        if (status === 'SERVING') {
            io.emit('token_called', updated);
        }
    }

    revalidatePath('/display')
    revalidatePath('/counter')
    return updated
}

// --- AI & Predictions ---

export async function getPredictedWaitTime(serviceId: number) {
    // 1. Calculate Average Service Duration (Last 10 completed tokens)
    const recentTokens = await prisma.token.findMany({
        where: {
            serviceId,
            status: 'COMPLETED',
            startedAt: { not: null },
            completedAt: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
    })

    let avgDurationMs = 5 * 60 * 1000 // Default 5 mins
    if (recentTokens.length > 0) {
        const totalDuration = recentTokens.reduce((acc: number, t: any) => {
            return acc + (t.completedAt.getTime() - t.startedAt.getTime())
        }, 0)
        avgDurationMs = totalDuration / recentTokens.length
    }

    // 2. Count People in Queue
    const queueLength = await prisma.token.count({
        where: {
            serviceId,
            status: 'WAITING'
        }
    })

    // 3. Count Active Counters for this Service
    // We need to find counters that have this service assigned
    const activeCounters = await prisma.counter.count({
        where: {
            isAvailable: true,
            services: {
                some: { id: serviceId }
            }
        }
    })

    const effectiveCounters = activeCounters || 1 // Avoid division by zero
    const estimatedWaitMs = (queueLength * avgDurationMs) / effectiveCounters

    return Math.ceil(estimatedWaitMs / 60000) // Return in Minutes
}

// --- Admin Actions ---

export async function createService(data: { name: string, prefix: string, startNumber: number, description?: string }) {
    const service = await prisma.service.create({ data })
    revalidatePath('/kiosk')
    return service
}

export async function deleteService(id: number) {
    const service = await prisma.service.update({
        where: { id },
        data: { isActive: false }
    })

    const io = (global as any).io;
    if (io) io.emit('config_updated');

    revalidatePath('/')
    revalidatePath('/kiosk')
    revalidatePath('/admin')
    revalidatePath('/counter')
    return service
}

export async function updateService(id: number, data: { name: string, prefix: string, startNumber: number }) {
    const { name, prefix, startNumber } = data
    const service = await prisma.service.update({
        where: { id },
        data: { name, prefix, startNumber }
    })

    const io = (global as any).io;
    if (io) io.emit('config_updated');

    revalidatePath('/')
    revalidatePath('/kiosk')
    revalidatePath('/admin')
    revalidatePath('/counter')
    revalidatePath('/display')
    return service
}

export async function createCounter(data: { name: string }) {
    const counter = await prisma.counter.create({ data })
    const io = (global as any).io;
    if (io) io.emit('config_updated');
    revalidatePath('/counter')
    revalidatePath('/admin')
    revalidatePath('/display')
    return counter
}

export async function updateCounter(id: number, data: { name: string }) {
    const counter = await prisma.counter.update({
        where: { id },
        data: { name: data.name }
    })

    const io = (global as any).io;
    if (io) io.emit('config_updated');

    revalidatePath('/counter')
    revalidatePath('/admin')
    revalidatePath('/display')
    return counter
}

export async function getCounters() {
    return await prisma.counter.findMany({ include: { services: true } })
}

export async function assignServiceToCounter(counterId: number, serviceId: number) {
    // This logic connects a service to a counter
    return await prisma.counter.update({
        where: { id: counterId },
        data: {
            services: { connect: { id: serviceId } }
        }
    })
}

export async function getSettings() {
    return await prisma.setting.findMany()
}

export async function updateSetting(key: string, value: string) {
    console.log(`[SETTINGS] Updating ${key} to "${value}"`)
    const res = await prisma.setting.upsert({
        where: { id: key },
        update: { value },
        create: { id: key, value }
    })
    revalidatePath('/admin')
    revalidatePath('/kiosk')
    return res
}

// --- Analytics ---

export async function getAnalytics() {
    // 1. Total Tokens Today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const totalToday = await prisma.token.count({
        where: { createdAt: { gte: today } }
    })

    const servingNow = await prisma.token.count({
        where: { status: 'SERVING' }
    })

    const completedToday = await prisma.token.count({
        where: {
            status: 'COMPLETED',
            createdAt: { gte: today }
        }
    })

    // 2. Breakdown by Service
    const services = await prisma.service.findMany({
        include: {
            _count: {
                select: { tokens: { where: { createdAt: { gte: today } } } }
            }
        }
    })

    // 3. Breakdown by Status
    const waiting = await prisma.token.count({ where: { status: 'WAITING' } })
    const skipped = await prisma.token.count({ where: { status: 'SKIPPED' } })

    return {
        totalToday,
        servingNow,
        completedToday,
        waiting,
        skipped,
        serviceStats: services.map((s: any) => ({ name: s.name, count: s._count.tokens }))
    }
}

export async function getReports(filters: { startDate?: string, endDate?: string, serviceId?: string, status?: string }) {
    const where: any = {}

    // Date Filter
    if (filters.startDate || filters.endDate) {
        where.createdAt = {}
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
        if (filters.endDate) {
            const end = new Date(filters.endDate)
            end.setHours(23, 59, 59, 999) // End of day
            where.createdAt.lte = end
        }
    }

    // Service Filter
    if (filters.serviceId && filters.serviceId !== 'all') {
        where.serviceId = parseInt(filters.serviceId)
    }

    // Status Filter
    if (filters.status && filters.status !== 'all') {
        where.status = filters.status
    }

    const tokens = await prisma.token.findMany({
        where,
        include: { service: true, counter: true },
        orderBy: { createdAt: 'desc' },
        take: 1000 // Limit for safety
    })

    return tokens
}

// --- Authentication ---

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { compareSync } from 'bcryptjs'

const SECRET_KEY = new TextEncoder().encode('your-secret-key-change-this')

export async function login(username: string, password: string): Promise<{ success: boolean, role?: string }> {
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user) return { success: false }

    // Compare Password
    const isValid = compareSync(password, user.password)
    if (!isValid) return { success: false }

    // Create Session
    const token = await new SignJWT({ sub: user.id.toString(), role: user.role, username: user.username })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .sign(SECRET_KEY)

    const cookieStore = await cookies()
    cookieStore.set('session', token, { httpOnly: true, secure: false })

    return { success: true, role: user.role }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}

export async function getSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return null

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY)
        return payload as { sub: string, role: string, username: string }
    } catch (e) {
        return null
    }
}

// Helper specific for Users Tab
export async function createUser(data: any) {
    // Check if admin
    const session = await getSession()
    if (session?.role !== 'ADMIN') throw new Error("Unauthorized")

    if (!data.username || !data.password) throw new Error("Missing fields")

    const { hashSync } = await import('bcryptjs')
    const hashedPassword = hashSync(data.password, 10)

    return await prisma.user.upsert({
        where: { username: data.username },
        update: {
            password: hashedPassword,
            role: data.role
        },
        create: {
            username: data.username,
            password: hashedPassword,
            role: data.role
        }
    })
}

export async function getUsers() {
    const session = await getSession()
    if (session?.role !== 'ADMIN') throw new Error("Unauthorized")

    return await prisma.user.findMany({
        select: { id: true, username: true, role: true, createdAt: true } // Don't return passwords
    })
}

export async function deleteUser(id: number) {
    const session = await getSession()
    if (session?.role !== 'ADMIN') throw new Error("Unauthorized")

    return await prisma.user.delete({ where: { id } })
}
// --- Printing ---


// --- Rich Printing (Silent HTML) ---
import { exec } from 'child_process'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import os from 'os'

export async function getPrinters() {
    return new Promise((resolve, reject) => {
        const command = `powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"`
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Get Printers Error:", stderr)
                resolve([]) // Return empty on error
            } else {
                try {
                    const printers = JSON.parse(stdout)
                    const list = Array.isArray(printers) ? printers : [printers]
                    resolve(list.map((p: any) => p.Name).filter(Boolean))
                } catch (e) {
                    // console.error("Parse Printers Error:", e) 
                    resolve([])
                }
            }
        })
    })
}

// Original Text Print (Deprecated but kept for safety if needed)
export async function printLastTokenOld(displayId: string, serviceName: string, organizationName: string) {
    return { success: false }
}

export async function printLastToken(displayId: string, serviceName: string, organizationName: string) {
    console.log(`[SERVER-PRINT-RICH] Printing ${displayId}...`)

    try {
        const templatePath = join(process.cwd(), 'app', 'receipt_template.html')
        let html = await readFile(templatePath, 'utf-8')

        // Get Settings
        const settings = await prisma.setting.findMany()
        const branchName = settings.find((s: any) => s.id === 'branch_name')?.value || 'City Center Branch'
        const targetPrinter = settings.find((s: any) => s.id === 'target_printer')?.value || ''

        // Convert Logo to Base64
        let logoHtml = ''
        try {
            const logoPath = join(process.cwd(), 'public', 'logo.png')
            const logoBuffer = await readFile(logoPath)
            const base64Logo = logoBuffer.toString('base64')
            logoHtml = `<img src="data:image/png;base64,${base64Logo}" class="logo" alt="Logo">`
        } catch (e) {
            console.warn("Could not load logo for print:", e)
        }

        // Replace placeholders
        html = html.replace('{{LOGO_IMG}}', logoHtml)
        html = html.replace('{{ORG_NAME}}', organizationName)
        html = html.replace('{{BRANCH_NAME}}', branchName)
        html = html.replace('{{SERVICE_NAME}}', serviceName)
        html = html.replace('{{TOKEN_NUMBER}}', displayId)
        html = html.replace('{{DATE_TIME}}', new Date().toLocaleString())

        const tempFile = join(os.tmpdir(), `ticket-${Date.now()}.html`)
        // Helper script
        const scriptPath = join(process.cwd(), 'print_silent.ps1')

        await writeFile(tempFile, html)

        // Execute PowerShell helper
        // Pass PrinterName if set (wrap in quotes)
        // Use single quotes for printer name in PS command to handle spaces safely if passed as string literal, but here we pass as argument
        const printerArg = targetPrinter ? `"${targetPrinter}"` : `""`
        const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" "${tempFile}" ${printerArg}`

        console.log(`[SERVER-PRINT-RICH] Command: ${command}`)

        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (stdout) console.log(`[PS-STDOUT]: ${stdout}`)
                if (stderr) console.warn(`[PS-STDERR]: ${stderr}`)

                if (error) {
                    if (stderr && !stderr.includes('Success')) console.warn("Print Script Warning:", stderr)
                    reject(error)
                } else {
                    resolve(stdout)
                }
            })
        })

        // Cleanup
        setTimeout(() => unlink(tempFile).catch(() => { }), 10000)
        console.log(`[SERVER-PRINT-RICH] Completed. Target: ${targetPrinter || 'Default'}`)

        return { success: true }
    } catch (e) {
        console.error("Printing failed detailed:", e)
        return { success: false, error: String(e) }
    }
}
