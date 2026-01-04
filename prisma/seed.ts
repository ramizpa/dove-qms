import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
    console.log("Seeding database...")

    // Seed Default Services
    const generalService = await prisma.service.upsert({
        where: { name: 'General' },
        update: {},
        create: {
            name: 'General',
            prefix: 'A',
            startNumber: 100,
            description: 'General Inquiry',
        },
    })

    const pharmacyService = await prisma.service.upsert({
        where: { name: 'Pharmacy' },
        update: {},
        create: {
            name: 'Pharmacy',
            prefix: 'P',
            startNumber: 100,
            description: 'Medicine Collection',
        },
    })

    // Seed Counter and assign to General Service by default
    const counter = await prisma.counter.upsert({
        where: { name: 'Counter 1' },
        update: {
            services: {
                connect: [{ id: generalService.id }, { id: pharmacyService.id }]
            }
        },
        create: {
            name: 'Counter 1',
            isAvailable: true,
            services: {
                connect: [{ id: generalService.id }, { id: pharmacyService.id }]
            }
        },
    })

    console.log('Seeded:', { counter, generalService, pharmacyService })

    // Seed Admin User
    // Password: admin123 (bcrypt hash)
    // Seed Admin User
    // Password: admin123 (hashed)
    try {
        await prisma.user.upsert({
            where: { username: 'admin' },
            update: {},
            create: {
                username: 'admin',
                password: hashSync('admin123', 10),
                role: 'ADMIN'
            }
        })
        console.log('Seeded Admin: admin / admin123')
    } catch (e) {
        console.log("Error seeding admin", e)
    }
}
main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
