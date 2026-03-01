import { Inter, Playfair_Display } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-serif',
});

export const metadata = {
  title: 'Strawberry Cash - Заработок Клубничек',
  description: 'Зарабатывайте клубнички за просмотр рекламы. 30 клубничек = 1 рубль.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <script src="//libtl.com/sdk.js" data-zone="10669509" data-sdk="show_10669509" defer></script>
      </head>
      <body className="bg-[#FFF5F5] text-[#2D1B1B] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
