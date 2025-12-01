// Connection pool manager for streaming requests
// Helps prevent too many concurrent connections to the same file

interface ConnectionInfo {
  userId: string;
  fileId: string;
  timestamp: number;
}

class StreamConnectionPool {
  private connections = new Map<string, ConnectionInfo[]>();
  private readonly maxConnectionsPerFile = 50; // Increased for 10-100 users
  private readonly maxConnectionsPerUser = 25; // Increased for better user experience

  private getFileKey(fileId: string): string {
    return `file:${fileId}`;
  }

  private getUserKey(userId: string): string {
    return `user:${userId}`;
  }

  canConnect(userId: string, fileId: string): { allowed: boolean; reason?: string } {
    const fileKey = this.getFileKey(fileId);
    const userKey = this.getUserKey(userId);
    
    const fileConnections = this.connections.get(fileKey) || [];
    const userConnections = this.connections.get(userKey) || [];
    
    // Check file-specific limit
    if (fileConnections.length >= this.maxConnectionsPerFile) {
      return { 
        allowed: false, 
        reason: `Too many concurrent connections to this file (max: ${this.maxConnectionsPerFile})` 
      };
    }
    
    // Check user-specific limit
    if (userConnections.length >= this.maxConnectionsPerUser) {
      return { 
        allowed: false, 
        reason: `Too many concurrent connections for user (max: ${this.maxConnectionsPerUser})` 
      };
    }
    
    return { allowed: true };
  }

  addConnection(userId: string, fileId: string): string {
    const connectionId = `${userId}:${fileId}:${Date.now()}:${Math.random()}`;
    const connectionInfo: ConnectionInfo = {
      userId,
      fileId,
      timestamp: Date.now(),
    };
    
    const fileKey = this.getFileKey(fileId);
    const userKey = this.getUserKey(userId);
    
    // Add to file connections
    const fileConnections = this.connections.get(fileKey) || [];
    fileConnections.push(connectionInfo);
    this.connections.set(fileKey, fileConnections);
    
    // Add to user connections
    const userConnections = this.connections.get(userKey) || [];
    userConnections.push(connectionInfo);
    this.connections.set(userKey, userConnections);
    
    return connectionId;
  }

  removeConnection(userId: string, fileId: string): void {
    const fileKey = this.getFileKey(fileId);
    const userKey = this.getUserKey(userId);
    
    // Remove from file connections
    const fileConnections = this.connections.get(fileKey) || [];
    const updatedFileConnections = fileConnections.filter(
      conn => !(conn.userId === userId && conn.fileId === fileId)
    );
    
    if (updatedFileConnections.length === 0) {
      this.connections.delete(fileKey);
    } else {
      this.connections.set(fileKey, updatedFileConnections);
    }
    
    // Remove from user connections
    const userConnections = this.connections.get(userKey) || [];
    const updatedUserConnections = userConnections.filter(
      conn => !(conn.userId === userId && conn.fileId === fileId)
    );
    
    if (updatedUserConnections.length === 0) {
      this.connections.delete(userKey);
    } else {
      this.connections.set(userKey, updatedUserConnections);
    }
  }

  cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    for (const [key, connections] of this.connections.entries()) {
      const activeConnections = connections.filter(
        conn => now - conn.timestamp < maxAge
      );
      
      if (activeConnections.length === 0) {
        this.connections.delete(key);
      } else {
        this.connections.set(key, activeConnections);
      }
    }
  }

  getStats(): { totalConnections: number; fileConnections: number; userConnections: number } {
    let totalConnections = 0;
    let fileConnections = 0;
    let userConnections = 0;
    
    for (const [key, connections] of this.connections.entries()) {
      if (key.startsWith('file:')) {
        fileConnections++;
        totalConnections += connections.length;
      } else if (key.startsWith('user:')) {
        userConnections++;
      }
    }
    
    return { totalConnections, fileConnections, userConnections };
  }
}

// Export singleton instance
export const streamConnectionPool = new StreamConnectionPool();

// Cleanup stale connections every 2 minutes
setInterval(() => {
  streamConnectionPool.cleanup();
}, 2 * 60 * 1000);