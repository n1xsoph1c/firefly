// Shared download token store
// In production, this should be replaced with Redis or a database

interface DownloadTokenData {
  fileId: string;
  userId: string;
  expiresAt: number;
}

class DownloadTokenStore {
  private tokens = new Map<string, DownloadTokenData>();

  set(token: string, data: DownloadTokenData): void {
    this.tokens.set(token, data);
    this.cleanup();
  }

  get(token: string): DownloadTokenData | undefined {
    const data = this.tokens.get(token);
    if (data && data.expiresAt < Date.now()) {
      this.tokens.delete(token);
      return undefined;
    }
    return data;
  }

  delete(token: string): void {
    this.tokens.delete(token);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [token, data] of this.tokens.entries()) {
      if (data.expiresAt < now) {
        this.tokens.delete(token);
      }
    }
  }

  size(): number {
    this.cleanup();
    return this.tokens.size;
  }
}

// Export singleton instance
export const downloadTokenStore = new DownloadTokenStore();