import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <main className="status-page">
      <section className="status-card">
        <span className="eyebrow">CAVEBOUND · CONTA</span>
        <h1>Não foi possível concluir a entrada.</h1>
        <p>O link pode ter expirado ou a configuração do provedor ainda não está completa.</p>
        <Link className="primary-button" href="/?auth=required">TENTAR NOVAMENTE</Link>
      </section>
    </main>
  );
}
