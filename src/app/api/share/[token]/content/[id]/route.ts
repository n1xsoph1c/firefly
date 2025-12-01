import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

interface FileWithId {
    id: string;
    name: string;
    [key: string]: any;
}

export async function GET(
    request: NextRequest,
    { params }: { params: { token: string; id: string } }
) {
    try {
        const { token, id: fileId } = params;

        // Verify share token
        const { prisma } = await import('@/lib/db');
        const share = await prisma.share.findUnique({
            where: { token },
            include: {
                file: true,
                folder: {
                    include: {
                        files: true,
                    },
                },
            },
        });

        if (!share) {
            return NextResponse.json({ error: 'Share not found' }, { status: 404 });
        }

        // Check if share has expired
        if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
        }

        // Check access limit
        if (share.maxAccess && share.accessCount >= share.maxAccess) {
            return NextResponse.json({ error: 'Access limit reached' }, { status: 403 });
        }

        // Find the file
        let file: FileWithId | null = share.file;

        if (!file && share.folder) {
            // If it's a folder share, find the file in the folder
            file = share.folder.files.find((f: FileWithId) => f.id === fileId) || null;
        }

        if (!file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Construct file path using filePath field
        const filePath = path.join(UPLOAD_PATH, file.filePath);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
        }

        // Read file content
        const content = await fs.readFile(filePath, 'utf-8');

        // Return content as plain text
        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Error fetching shared file content:', error);
        return NextResponse.json(
            { error: 'Failed to fetch file content' },
            { status: 500 }
        );
    }
}
