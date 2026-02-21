import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="not-found">
      <h2>404 - Page Not Found</h2>
      <Link href="/">Go Home</Link>
    </div>
  )
}
