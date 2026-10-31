import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
