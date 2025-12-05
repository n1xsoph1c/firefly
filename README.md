# 🔥 Firefly

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)

A modern, self-hosted cloud storage Progressive Web App (PWA) optimized for iOS, built with Next.js, TypeScript, and Tailwind CSS. Features include large file uploads (up to 50GB), smooth 4K video streaming, offline functionality, file system sync, and native iOS app experience.

## ✨ Features

### 📱 PWA & Mobile Experience
- 🍎 **iOS PWA Support**: Native app experience on iPhone/iPad with home screen installation
- 📱 **Offline Functionality**: Queue uploads when offline, automatic sync when online
- 🔔 **Push Notifications**: Upload complete, sync status, and file sharing alerts
- 🚀 **Background Sync**: Uploads continue even when app is backgrounded
- 📲 **Add to Home Screen**: One-tap installation like native apps

### 🎥 Advanced Video Streaming
- ⚡ **4K Video Streaming**: Optimized streaming with HTTP range request support
- 🎬 **YouTube-like Performance**: Minimal latency, instant seeking
- 💾 **Offline Video Cache**: Previously streamed content available offline
- 📺 **Mobile-Optimized Player**: Touch-friendly controls for iOS Safari

### 💾 File Management  
- 🚀 **Large File Uploads**: Support for files up to 50GB with progress tracking
- 📁 **Folder Management**: Create and organize files in hierarchical folders
- 🔗 **Shareable Links**: Generate permanent, secure links for files and folders
- 🗂️ **File System Sync**: Automatic sync between local file system and database
- ☁️ **Local Storage**: All files stored locally on your server (no S3 required)

### 🔒 Security & Performance
- 🔐 **Secure Authentication**: Admin authentication with JWT and HTTP-only cookies
- 🛡️ **NGINX Optimized**: Enhanced buffers and rate limiting for large file uploads and 4K streaming
- ⚡ **Turbopack**: Lightning-fast development and build performance
- 📊 **Storage Analytics**: Real-time usage monitoring

## 🛠️ Tech Stack

### Frontend & PWA
- **Framework**: Next.js 15 with Turbopack, React 19, TypeScript
- **Styling**: Tailwind CSS  with mobile-first responsive design
- **PWA**: Service Worker, IndexedDB, Push Notifications, Background Sync
- **iOS Integration**: Apple touch icons, splash screens, native app feel

### Backend & Infrastructure
- **API**: Next.js API Routes with enhanced file upload handling
- **Database**: Prisma ORM with SQLite (easily configurable for PostgreSQL/MySQL)
- **Storage**: Local file system storage (no S3 dependency)
- **Server**: NGINX reverse proxy with 4K streaming optimizations
- **Authentication**: JWT-based authentication with HTTP-only cookies
- **File Upload**: React Dropzone with drag-and-drop support

## 📋 Prerequisites

- Node.js 18+ or Bun
- Linux/Unix server (for production)
- NGINX web server (for production)
- PM2 process manager (for production)

## 🚀 Quick Start (Development)

1. **Clone the Repository**
   ```bash
   git clone https://github.com/n1xsoph1c/firefly.git
   cd firefly
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or with Bun
   bun install
   ```

3. **Configure Environment Variables**
   
   Copy `.env.example` to `.env` and update with your configuration:
   ```bash
   cp .env.example .env
   ```
   
   Key configuration options:
   ```env
   # App Branding
   APP_NAME="Firefly"                      # Your application name
   APP_URL="http://localhost:3000"         # Your domain URL
   
   # Database
   DATABASE_URL="file:./dev.db"
   
   # Authentication
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Admin Account
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD="your-secure-password"
   ADMIN_USERNAME="admin"
   
   # File Upload
   UPLOAD_PATH="./uploads"                 # Local storage path
   MAX_FILE_SIZE="53687091200"             # 50GB in bytes
   ```

4. **Initialize Database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run init
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Open http://localhost:3000  
   - Login with your admin credentials
   - Start uploading files!

## 🚀 Production Deployment

> **Note**: Docker support is coming soon! For now, we recommend using NGINX + PM2 for production deployments.

### Prerequisites
- VPS/Server with Node.js 18+ (or Bun)
- NGINX web server
- PM2 process manager
- SSL certificate (Let's Encrypt recommended)

### Step 1: Server Setup

1. **Install Dependencies**
   ```bash
   # Install Node.js (if not installed)
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 globally
   npm install -g pm2
   
   # Install NGINX
   sudo apt-get install -y nginx
   ```

2. **Clone and Build**
   ```bash
   git clone https://github.com/YOUR-USERNAME/firefly.git
   cd firefly
   
   # Install dependencies
   npm install
   
   # Build the application
   npm run build
   ```

### Step 2: Configure PM2

1. **Create Logs Directory**
   ```bash
   mkdir -p logs
   ```

2. **Update `ecosystem.config.js`**
   
   The repository includes an `ecosystem.config.js` file. Update the `cwd` path:
   ```javascript
   cwd: '/var/www/firefly',  // Update to your installation path
   ```

3. **Start with PM2**
   ```bash
   # Start the application
   pm2 start ecosystem.config.js
   
   # Save PM2 process list
   pm2 save
   
   # Setup PM2 to start on system boot
   pm2 startup
   ```

4. **PM2 Management Commands**
   ```bash
   pm2 status              # Check status
   pm2 logs firefly        # View logs
   pm2 restart firefly     # Restart app
   pm2 stop firefly        # Stop app
   pm2 delete firefly      # Remove from PM2
   ```

### Step 3: Configure NGINX

1. **Use Sample Configuration**
   
   A sample NGINX configuration is provided in `configs/nginx-config.conf`. Copy and customize it:
   
   ```bash
   sudo cp configs/nginx-config.conf /etc/nginx/sites-available/firefly
   ```

2. **Update the Configuration**
   
   Edit `/etc/nginx/sites-available/firefly` and replace:
   - `<YOUR_DOMAIN>` with your actual domain
   - SSL certificate paths once you have them

3. **Enable the Site**
   ```bash
   # Create symbolic link
   sudo ln -s /etc/nginx/sites-available/firefly /etc/nginx/sites-enabled/
   
   # Test NGINX configuration
   sudo nginx -t
   
   # Reload NGINX
   sudo systemctl reload nginx
   ```

4. **Setup SSL with Let's Encrypt**
   ```bash
   # Install Certbot
   sudo apt-get install certbot python3-certbot-nginx
   
   # Get SSL certificate
   sudo certbot --nginx -d yourdomain.com
   
   # Auto-renewal is configured by default
   ```

### Step 4: Environment Configuration

Update `.env` for production:
```env
# App Configuration
APP_NAME="Your App Name"
APP_URL="https://yourdomain.com"

# Database
DATABASE_URL="file:./prod.db"

# Application Security
NEXTAUTH_SECRET="your-strong-random-secret"
NEXTAUTH_URL="https://yourdomain.com"

# Admin
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="your-secure-password"

# File Storage
UPLOAD_PATH="/var/www/firefly/uploads"
```

### Step 5: Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Initialize admin user
npm run init
```

### Maintenance & Monitoring

```bash
# View application logs
pm2 logs firefly

# Monitor resource usage
pm2 monit

# View NGINX logs
sudo tail -f /var/log/nginx/access.log

# Restart after updates
git pull
npm install
npm run build
pm2 restart firefly
```

## 📱 PWA Installation (iOS)

### Install as Native iOS App:
1. **Open Safari** on your iPhone/iPad
2. **Navigate** to your app URL
3. **Tap Share button** → **"Add to Home Screen"**
4. **Customize name** and tap **"Add"**
5. **Launch from home screen** like a native app!

### PWA Features:
- 🍎 **Native iOS experience** - Full screen, no browser UI
- 📱 **Offline uploads** - Queue files when offline, sync when online
- 🔔 **Push notifications** - Upload status and sync alerts
- 🚀 **Background sync** - Uploads continue when app is backgrounded

## 🤝 Contributing

We welcome contributions from the community! Whether it's bug fixes, new features, documentation improvements, or feedback, your help is appreciated.

### How to Contribute

1. **Fork the Repository**
   
   Click the "Fork" button at the top right of the repository page to create your own copy.

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/firefly.git
   cd firefly
   ```

3. **Set Up Upstream Remote**
   ```bash
   git remote add upstream https://github.com/n1xsoph1c/firefly.git
   git remote -v
   ```

4. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes
   git checkout -b fix/bug-description
   ```

5. **Make Your Changes**
   - Write clean, maintainable code
   - Follow the existing code style
   - Add comments where necessary

6. **Test Your Changes**
   ```bash
   npm run dev      # Test in development
   npm run build    # Test production build
   npm run lint     # Check for lint errors
   ```

7. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add awesome new feature"
   ```
   
   **Commit Message Guidelines:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes
   - `refactor:` Code refactoring
   - `perf:` Performance improvements
   - `test:` Adding/updating tests
   - `chore:` Maintenance tasks

8. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

9. **Create a Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Provide a clear title and description
   - Submit the PR!

### Development Guidelines
- **Code Quality**: Clean, well-documented TypeScript code
- **Testing**: Test thoroughly in different scenarios
- **Performance**: Keep performance in mind for file operations and streaming
- **Security**: Never commit sensitive data

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- 🐛 **Issues**: Report bugs in [GitHub Issues](https://github.com/n1xsoph1c/firefly/issues)
- 💬 **Discussions**: Ask questions in [GitHub Discussions](https://github.com/n1xsoph1c/firefly/discussions)

## 🔄 Roadmap

- [ ] Docker deployment support
- [ ] Multi-user support with user registration
- [ ] Advanced sharing permissions  
- [ ] File versioning
- [ ] Thumbnail generation
- [ ] Batch operations
- [ ] Activity logging
- [ ] Storage usage analytics

---

**Built with ❤️ by the open source community**
