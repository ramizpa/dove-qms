import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkAdmin() {
    console.log('Checking for admin user...')
    const admin = await prisma.user.findUnique({
        where: { username: 'admin' }
    })

    if (admin) {
        console.log('✅ Admin user FOUND.')
        console.log('ID:', admin.id)
        console.log('Password Hash:', admin.password)

        // Test password 'admin'
        const match = await bcrypt.compare('admin', admin.password)
        console.log('Does password "admin" match?', match ? 'YES' : 'NO')
    } else {
        console.log('❌ Admin user NOT FOUND.')
        console.log('Creating default admin user...')
        const hashedPassword = await bcrypt.hash('admin', 10)
        await prisma.user.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                role: 'ADMIN',
                name: 'Administrator'
            }
        })
        console.log('✅ Default admin user "admin" created with password "admin".')
    }
}

checkAdmin()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
