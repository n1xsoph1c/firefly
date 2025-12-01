import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const token = request.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const fileId = params.id;

        // Get file from database
        const { prisma } = await import('@/lib/db');
        const file = await prisma.file.findUnique({
            where: { id: fileId },
            include: { user: true },
        });

        if (!file) {
            return NextResponse.json({ error: 'File not found in database' }, { status: 404 });
        }

        // Check if user owns the file or is admin
        if (file.userId !== payload.userId && !payload.isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Construct file path using filePath field which contains the full relative path
        const filePath = path.join(UPLOAD_PATH, file.filePath);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (accessError) {
            console.error('File not found on disk:', filePath, accessError);
            return NextResponse.json({
                error: 'File not found on disk',
                details: `Path: ${filePath}`
            }, { status: 404 });
        }

        // Read file content - try UTF-8 first, fallback to buffer
        try {
            const content = await fs.readFile(filePath, 'utf-8');

            // Return content as plain text
            return new NextResponse(content, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'private, max-age=3600',
                },
            });
        } catch (readError) {
            console.error('Error reading file as UTF-8:', readError);
            // If UTF-8 fails, it might be a binary file
            return NextResponse.json({
                error: 'Cannot read file as text',
                details: 'This file may be binary or corrupted'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error fetching file content:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch file content',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
