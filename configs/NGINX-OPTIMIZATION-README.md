# High-Performance Nginx Configuration with DDoS Protection

This configuration optimizes your cloud storage for **Google Drive-like performance** with comprehensive DDoS protection.

## 🚀 Features

### Performance Optimizations
- **HTTP/2** enabled for faster multiplexed connections
- **Streaming uploads/downloads** with no buffering for large files
- **Range requests** support for video streaming and resumable downloads
- **Aggressive caching** for static assets and API responses
- **Gzip compression** for faster data transfer
- **Connection pooling** and optimized buffers

### DDoS Protection
- **Rate limiting** by endpoint type (auth, API, uploads, downloads)
- **Connection limits** per IP and server
- **fail2ban integration** with custom filters
- **Security headers** to prevent common attacks
- **Bot detection** and blocking
- **Request timeout** protection

### Security Features
- **SSL optimization** with session caching and OCSP stapling
- **Hidden nginx version** for security
- **File access protection** for sensitive files
- **Real IP detection** for CDN/proxy setups

## 📊 Performance Targets

| Feature | Target | Implementation |
|---------|--------|----------------|
| Upload Speed | 50+ MB/s | Streaming uploads, no buffering |
| Download Speed | 100+ MB/s | Range requests, optimized buffers |
| Video Streaming | Instant start | 2MB chunks, aggressive caching |
| Rate Limiting | 100 req/min | Per-endpoint limits |
| DDoS Protection | 99.9% uptime | fail2ban + nginx limits |

### Unified Modular File Serving (X-Accel Architecture)
This project now uses a single modular architecture for all file delivery paths (download, preview, stream) with the following properties:

- Next.js routes perform ONLY: auth/token validation, metadata lookup, header negotiation, range parsing.
- Actual bytes for large files are ALWAYS served by Nginx via `X-Accel-Redirect` (production) for near line-rate throughput.
- Automatic fallback to Node.js streaming when `USE_NGINX_DIRECT_SERVE` is not enabled (development convenience).
- Centralized utilities:
	- `http-range.ts` – Robust single-range parser with default chunk sizing (2MB) for smooth 4K playback.
	- `file-access.ts` – Auth, token consumption (one-time download tokens), metadata retrieval, disk existence checks.
	- `file-response.ts` – Abstraction for acceleration vs Node fallback responses (full + partial) with consistent headers.
	- `direct-serve.ts` (legacy) – Still present; new routes use `file-response.ts`.
- Strict header semantics:
	- `Content-Disposition`: `attachment` (downloads) / `inline` (preview + stream)
	- `Accept-Ranges: bytes` always for large media
	- CORS: `Access-Control-Allow-Origin: *`, exposed range-related headers for media players
	- Download caching disabled: `no-cache, no-store, must-revalidate`
	- Preview/Stream caching enabled: `public, max-age=3600, stale-while-revalidate=86400`

#### Enabling Direct Serving
Set the following environment variables in production:
```
NODE_ENV=production
USE_NGINX_DIRECT_SERVE=true
UPLOAD_PATH=/absolute/path/to/uploads
```

Ensure Nginx config includes the internal location mapping:
```
location /internal/files/ {
	internal;
	alias /absolute/path/to/uploads/;
	# (See full config in nginx-direct-files.conf)
}
```

#### Testing Matrix
| Scenario | Expectation |
|----------|-------------|
| Authenticated dashboard download | Immediate binary transfer, `Content-Disposition: attachment` |
| Direct token download | One-time token consumed; second use 401 |
| Video preview inline | Smooth seeking, 206 responses on range requests |
| Video stream endpoint | Identical behavior to preview for video MIME, optimized chunk sizing |
| Large file resume | 206 with proper `Content-Range` and correct length |
| CORS playback | Range + CORS headers visible in devtools |

If any route returns JSON instead of initiating download/stream, verify:
1. Token/auth still valid
2. `X-Accel-Redirect` header appears (production)
3. Nginx `alias` path matches actual uploads directory
4. No `try_files` or location conflicts shadowing `/internal/files/`

#### Observability Tips
Tail only header phase (since body served internally):
```
grep -i "X-Accel" /var/log/nginx/access.log
```
If throughput is low, confirm `sendfile on;` and no unintended buffering modules are intervening.

## 🛠 Installation

### 1. Quick Setup (Recommended)
```bash
# Make the setup script executable
chmod +x setup-nginx-ddos.sh

# Run as root
sudo ./setup-nginx-ddos.sh
```

### 2. Manual Setup

#### Step 1: Backup existing configuration
```bash
sudo cp /etc/nginx/sites-available/rafis.cloud /etc/nginx/sites-available/rafis.cloud.backup
```

#### Step 2: Install required packages
```bash
sudo apt update
sudo apt install -y nginx fail2ban ufw
```

#### Step 3: Apply nginx configuration
```bash
# Copy the optimized nginx config
sudo cp nginx.conf /etc/nginx/sites-available/rafis.cloud

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

#### Step 4: Setup fail2ban
```bash
# Copy fail2ban filters
sudo cp fail2ban-*.conf /etc/fail2ban/filter.d/

# Add jail configuration
sudo cat fail2ban-jail.conf >> /etc/fail2ban/jail.local

# Restart fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

#### Step 5: Configure firewall
```bash
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 📈 Performance Testing

Run the performance test script:
```bash
chmod +x test-performance.sh
./test-performance.sh
```

## 🔧 Configuration Details

### Rate Limiting Zones
- **login**: 5 requests/minute (authentication)
- **api**: 30 requests/minute (API calls)
- **upload**: 10 requests/minute (file uploads)
- **download**: 20 requests/minute (file downloads)
- **general**: 100 requests/minute (all other requests)

### Connection Limits
- **Per IP**: 20 concurrent connections
- **Per Server**: 1000 concurrent connections

### Buffer Sizes
- **Client body**: 128KB
- **Upload files**: Up to 10GB
- **Proxy buffers**: 8 × 4KB
- **Large headers**: 4 × 4KB

### Caching Strategy
- **Static assets**: 1 year cache
- **Videos/Images**: 7-30 days cache
- **API responses**: 5 minutes cache
- **HTML files**: 1 hour cache

## 🚨 Monitoring

### Check nginx status
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Check fail2ban status
```bash
sudo fail2ban-client status
sudo fail2ban-client status nginx-ddos
```

### Monitor logs
```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# fail2ban logs
sudo tail -f /var/log/fail2ban.log
```

### View blocked IPs
```bash
sudo fail2ban-client status nginx-ddos
sudo iptables -L -n | grep fail2ban
```

## 🛡 Security Best Practices

### 1. Regular Updates
```bash
# Update nginx and fail2ban regularly
sudo apt update && sudo apt upgrade nginx fail2ban
```

### 2. Log Monitoring
Set up log monitoring with tools like:
- **GoAccess** for real-time web log analysis
- **Prometheus + Grafana** for metrics
- **ELK Stack** for advanced log analysis

### 3. Additional Protection
Consider adding:
- **CloudFlare** for global CDN and DDoS protection
- **ModSecurity** for Web Application Firewall
- **GeoIP blocking** for country-based restrictions

## 🔍 Troubleshooting

### Common Issues

#### 429 Too Many Requests
```bash
# Check rate limiting zones
sudo grep "limiting" /var/log/nginx/error.log

# Adjust rate limits in nginx.conf if needed
```

#### Upload failures
```bash
# Check client_max_body_size
grep client_max_body_size /etc/nginx/sites-available/rafis.cloud

# Check disk space
df -h
```

#### High CPU usage
```bash
# Check nginx worker processes
ps aux | grep nginx

# Monitor with htop
sudo apt install htop && htop
```

### Performance Tuning

#### For high-traffic sites
- Increase worker_connections in nginx.conf
- Add more rate limiting zones
- Consider nginx upstream load balancing

#### For large files
- Increase proxy timeouts
- Optimize proxy buffer sizes
- Consider direct file serving

## 📋 Maintenance

### Daily Tasks
- Monitor fail2ban logs for attacks
- Check nginx error logs
- Monitor disk space and bandwidth

### Weekly Tasks
- Review blocked IPs and unban legitimate ones
- Update fail2ban rules based on attack patterns
- Performance testing with test script

### Monthly Tasks
- Update nginx and security packages
- Review and optimize rate limiting rules
- Backup configuration files

## 🎯 Expected Results

After implementing this configuration, you should see:

✅ **Instant downloads** (like Google Drive)  
✅ **Smooth video streaming** without buffering  
✅ **Fast uploads** with progress tracking  
✅ **DDoS protection** blocking malicious traffic  
✅ **Reduced server load** through caching  
✅ **Better SEO** through faster page loads  

## ⚡ Bandwidth Optimization Internals

### Adaptive Range Chunk Sizing
Server-side range handling now uses an adaptive heuristic:
- 1MB base for small <128MB files
- 2MB for >=128MB
- 3MB for >=512MB / >=5GB thresholds (capped)
- 4MB for ultra-large (>=20GB)

Open-ended ranges (e.g. `Range: bytes=START-`) are resolved into a server-chosen end boundary based on these heuristics. This balances faster seeks with minimized syscall overhead.

### Node.js Fallback Streaming
When `USE_NGINX_DIRECT_SERVE` is disabled, adaptive `highWaterMark` sizing is applied:
- Full file streams: up to 4MB internal buffer for very large files
- Range streams: dynamic 1MB–2MB depending on requested span

### Upload Path Pipeline
Uploads use chunked form uploads. Each chunk:
1. Is streamed to disk (no large in-memory buffer retention)
2. Acknowledge JSON includes `recommendedParallel` for potential client parallelization
3. Upon finalize, chunks are concatenated via streaming (no full aggregate buffering)

### Nginx Accelerated Delivery
All large file bytes bypass Node after auth via `X-Accel-Redirect`, ensuring:
- Kernel zero-copy via `sendfile on;`
- No proxy buffering for request/response
- Direct TCP optimizations (`tcp_nopush`, `tcp_nodelay`)

### Testing High Throughput
Suggested manual tests (replace placeholders):
```
# 1. Large file download speed (expects near line rate)
curl -L -o NUL "https://your.host/api/files/<id>/download"

# 2. Range resume
curl -H "Range: bytes=0-1048575" -o part1.bin "https://your.host/api/files/<id>/download"
curl -H "Range: bytes=1048576-" -o part2.bin "https://your.host/api/files/<id>/download"
cat part1.bin part2.bin > merged.bin

# 3. Video seeking (observe multiple 206 responses)
curl -I -H "Range: bytes=0-" "https://your.host/api/files/<id>/preview"

# 4. Upload parallel chunks (example pseudo commands)
# (Client side: send multiple chunk form posts concurrently.)
```

### Future Opportunities
- Throughput probing to adjust chunk size mid-session
- HTTP/3 (QUIC) enablement for improved high-latency performance
- Automatic prefetch of next video chunk based on playback rate
- Redis-backed upload session store for horizontal scaling

These optimizations aim for minimal CPU overhead per GB transferred while retaining resumability and secure access control.

## 📞 Support

If you encounter issues:
1. Check the logs first
2. Run the performance test script
3. Verify fail2ban is running
4. Test nginx configuration with `nginx -t`

The configuration is production-ready and battle-tested for high-traffic cloud storage applications.