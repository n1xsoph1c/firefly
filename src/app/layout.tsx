import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_URL } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: APP_NAME,
  description: `Professional cloud storage with 4K video streaming, file management, and sharing. Works offline with sync.`,
  keywords: ["cloud storage", "file sharing", "video streaming", "photo backup", "4K video", "PWA", "offline storage"],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
    startupImage: [
      {
        url: "/logo-512.png",
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/logo-512.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      }
    ]
  },
  openGraph: {
    title: APP_NAME,
    description: `Professional cloud storage with 4K video streaming, file management, and sharing. Works offline with sync.`,
    type: "website",
    locale: "en_US",
    siteName: APP_NAME,
    images: [
      {
        url: "/logo-512.png",
        width: 512,
        height: 512,
        alt: "Cloud Storage Logo"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: `Professional cloud storage with 4K video streaming, file management, and sharing.`,
    images: ["/logo-512.png"]
  },
  robots: {
    index: false,
    follow: false,
  },
  other: {
    // iOS PWA specific meta tags
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': APP_NAME,
    'mobile-web-app-capable': 'yes',
    'application-name': APP_NAME,
    'theme-color': '#0a0a0a',
    'format-detection': 'telephone=no',
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
  ],
  colorScheme: "dark light", // Prefer dark mode
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* iOS PWA Meta Tags and Icons */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={APP_NAME} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo-192.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/logo-192.png" />
        <link rel="mask-icon" href="/logo-no-circle.png" color="#3b82f6" />

        {/* iOS Safari Splash Screens for different devices */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/logo-512.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/logo-512.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/logo-512.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/logo-512.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/logo-512.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/logo-512.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/logo-512.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/logo-512.png" />

        {/* Service Worker Registration - iOS Optimized */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // iOS PWA detection and fullscreen enforcement
              function isIOSPWA() {
                return window.navigator.standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
              }
              
              function isIOS() {
                return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
              }
              
              // Force iOS to recognize PWA state
              if (isIOS()) {
                // Add class to body for iOS-specific styling
                document.documentElement.classList.add('ios-device');
                
                if (isIOSPWA()) {
                  document.documentElement.classList.add('ios-pwa');
                  // Hide URL bar if it's showing
                  window.scrollTo(0, 1);
                  setTimeout(() => window.scrollTo(0, 0), 0);
                }
              }
              
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                      
                      // iOS Safari notification permission handling
                      if ('Notification' in window && Notification.permission === 'default') {
                        // Delay request to improve user experience on iOS
                        setTimeout(() => {
                          Notification.requestPermission();
                        }, 2000);
                      }
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
              
              // iOS PWA install prompt (shows Add to Home Screen guidance)
              window.showIOSInstallPrompt = () => {
                if (!isIOSPWA() && isIOS()) {
                  // Show custom iOS install instructions
                  const instructions = document.createElement('div');
                  instructions.innerHTML = \`
                    <div style="position: fixed; top: 0; left: 0; right: 0; background: #3b82f6; color: white; padding: 12px; text-align: center; z-index: 9999;">
                      <p style="margin: 0; font-size: 14px;">
                        📱 Install Cloud Storage: Tap Share button, then "Add to Home Screen"
                      </p>
                      <button onclick="this.parentElement.remove()" style="position: absolute; right: 8px; top: 8px; background: none; border: none; color: white; font-size: 18px;">×</button>
                    </div>
                  \`;
                  document.body.appendChild(instructions);
                  
                  // Auto-hide after 10 seconds
                  setTimeout(() => {
                    if (instructions.parentElement) {
                      instructions.remove();
                    }
                  }, 10000);
                }
              };
              
              // Show install prompt on first visit
              if (!localStorage.getItem('pwa-install-shown') && isIOS() && !isIOSPWA()) {
                setTimeout(() => {
                  window.showIOSInstallPrompt();
                  localStorage.setItem('pwa-install-shown', 'true');
                }, 3000);
              }
              
              // CRITICAL FIX: Use CSS for zoom prevention instead of blocking touch events
              // This prevents zoom WITHOUT disabling scrolling
              if (isIOSPWA()) {
                // Add CSS-based zoom prevention
                const style = document.createElement('style');
                style.textContent = \`
                  html, body {
                    touch-action: pan-x pan-y !important;
                    -ms-touch-action: pan-x pan-y !important;
                  }
                  * {
                    -webkit-user-select: none;
                    -webkit-touch-callout: none;
                  }
                  input, textarea {
                    -webkit-user-select: text !important;
                  }
                \`;
                document.head.appendChild(style);
                
                // Only prevent multi-touch (pinch zoom), allow single touch (scroll)
                document.addEventListener('touchstart', function(event) {
                  if (event.touches.length > 1) {
                    event.preventDefault();
                  }
                }, { passive: false });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased`}
        style={{ background: 'var(--background)', color: 'var(--text-primary)' }}
      >
        {children}
      </body>
    </html>
  );
}
