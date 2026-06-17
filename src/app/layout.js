import './globals.css'

export const metadata = {
  title: 'Brand Hub — Vancouver Marketing Agency',
  description: 'Client brand management dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
