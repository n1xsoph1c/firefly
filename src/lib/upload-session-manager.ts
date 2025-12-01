// Shared upload session management
// In production, this should be replaced with Redis or database storage

export interface UploadSession {
  uploadId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  folderId?: string;
  userId: string;
  chunks: Set<number>;
  createdAt: number;
}

class UploadSessionManager {
  private sessions = new Map<string, UploadSession>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old sessions every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 30 * 60 * 1000);
  }

  createSession(uploadId: string, session: Omit<UploadSession, 'chunks' | 'createdAt'>): void {
    this.sessions.set(uploadId, {
      ...session,
      chunks: new Set(),
      createdAt: Date.now(),
    });
  }

  getSession(uploadId: string): UploadSession | undefined {
    return this.sessions.get(uploadId);
  }

  deleteSession(uploadId: string): void {
    this.sessions.delete(uploadId);
  }

  addChunk(uploadId: string, chunkIndex: number): boolean {
    const session = this.sessions.get(uploadId);
    if (!session) return false;
    
    session.chunks.add(chunkIndex);
    return true;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [uploadId, session] of this.sessions.entries()) {
      if (now - session.createdAt > maxAge) {
        this.sessions.delete(uploadId);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global instance
const uploadSessionManager = new UploadSessionManager();

export default uploadSessionManager;