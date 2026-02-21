import NotifyButton from '@/components/NotifyButton'

export default function Home() {
  return (
    <main className="container">
      <h1>telbot</h1>
      <p>텔레그램 알림 전송 패널</p>

      <section className="notify-section">
        <NotifyButton type="test" label="🧪 테스트 알림 전송" />
      </section>
    </main>
  )
}
