import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Primary Meta Tags */}
        <meta name="theme-color" content="#10b981" />
        <meta name="description" content="Comprehensive ward management and reporting system for coordinators and administrators" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Ward Management System" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ward Mgmt" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#10b981" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-192x192.png" />
        
        {/* Splash Screens for iOS */}
        <link rel="apple-touch-startup-image" href="/icon-512x512.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Service Worker Registration with update handling
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('✅ Service Worker registered successfully');
                      
                      // Check for updates periodically
                      setInterval(() => {
                        registration.update();
                      }, 60 * 60 * 1000); // Check every hour
                      
                      // Handle updates
                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('🔄 Service Worker update found');
                        
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('✨ New Service Worker available');
                            // Optionally show update notification to user
                            if (window.confirm('New version available! Reload to update?')) {
                              newWorker.postMessage({ type: 'SKIP_WAITING' });
                              window.location.reload();
                            }
                          }
                        });
                      });
                    })
                    .catch(function(error) {
                      console.error('❌ Service Worker registration failed:', error);
                    });
                  
                  // Handle controller change (new SW activated)
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('🔄 Service Worker controller changed');
                  });
                });
              }
              
              // PWA Install Prompt Handler
              let deferredPrompt;
              
              window.addEventListener('beforeinstallprompt', (e) => {
                console.log('💾 PWA install prompt available');
                // Prevent the default browser install prompt
                e.preventDefault();
                // Store the event for later use
                deferredPrompt = e;
                
                // Optionally show custom install button
                const installButton = document.getElementById('pwa-install-btn');
                if (installButton) {
                  installButton.style.display = 'block';
                  installButton.addEventListener('click', async () => {
                    if (deferredPrompt) {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      console.log('PWA install outcome:', outcome);
                      deferredPrompt = null;
                      installButton.style.display = 'none';
                    }
                  });
                }
              });
              
              // Track installation
              window.addEventListener('appinstalled', () => {
                console.log('✅ PWA installed successfully');
                deferredPrompt = null;
              });
              
              // Detect if running as PWA
              window.addEventListener('load', () => {
                if (window.matchMedia('(display-mode: standalone)').matches || 
                    window.navigator.standalone === true) {
                  console.log('🚀 Running as PWA');
                  document.body.classList.add('pwa-mode');
                } else {
                  console.log('🌐 Running in browser');
                }
              });
            `,
          }}
        />
      </body>
    </Html>
  );
}