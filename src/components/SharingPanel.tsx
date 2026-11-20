import { Download, QrCode, Send } from 'lucide-react';

export function SharingPanel() {
  return (
    <section className="sharing-panel" aria-label="Opções de compartilhamento">
      <div className="sharing-panel__qr">
        <QrCode size={28} aria-hidden="true" />
        <strong>QR Code indisponível</strong>
        <span>Disponível na Etapa 09.</span>
      </div>
      <div className="sharing-method">
        <Download aria-hidden="true" />
        <div>
          <h2>Download</h2>
          <p>
            Quando o QR Code estiver disponível, escaneie com o celular e siga as instruções para
            baixar a foto.
          </p>
        </div>
      </div>
      <div className="sharing-method">
        <Send aria-hidden="true" />
        <div>
          <h2>Instagram</h2>
          <p>Integração indisponível até a Etapa 10.</p>
        </div>
      </div>
    </section>
  );
}
