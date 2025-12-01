import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFiles() {
    const files = await prisma.file.findMany({
        where: {
            originalName: {
                contains: 'test'
            }
        },
        take: 5
    });

    console.log('Full file records:');
    files.forEach(file => {
        console.log('\n---');
        console.log('ID:', file.id);
        console.log('name:', file.name);
        console.log('originalName:', file.originalName);
        console.log('filePath:', file.filePath);
        console.log('mimeType:', file.mimeType);
    });

    await prisma.$disconnect();
}

checkFiles().catch(console.error);
