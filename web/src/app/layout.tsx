import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ProWatch AI Studio - Smart Watch Web Dashboard',
  description: 'Hệ thống giám sát dữ liệu đồng hồ thông minh XIAO ESP32-S3, MAX30102, MPU6050, n8n và Python ML Service',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(event) {
                  var file = event.filename || (event.error && event.error.stack) || '';
                  if (typeof file === 'string' && (file.indexOf('chrome-extension:') !== -1 || file.indexOf('moz-extension:') !== -1)) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(event) {
                  var stack = (event.reason && (event.reason.stack || event.reason.message)) || String(event.reason || '');
                  if (typeof stack === 'string' && (stack.indexOf('chrome-extension:') !== -1 || stack.indexOf('moz-extension:') !== -1)) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">{children}</body>
    </html>
  );
}
