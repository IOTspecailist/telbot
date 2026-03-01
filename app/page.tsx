import MainPanel from '@/components/MainPanel'

export default function Home() {
  return (
    <main className="container">
      <header className="page-header">
        <h1 className="page-title">telbot</h1>
        <p className="page-sub">텔레그램 알림 전송 패널</p>
      </header>

      <MainPanel />
    </main>
  )
}
