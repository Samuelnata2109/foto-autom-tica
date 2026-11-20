import type { useGestureRecognition } from '../hooks/useGestureRecognition';
import type { GesturePhase } from '../types/gesture';
export function GestureDiagnostics({
  ai,
  phase,
}: {
  ai: ReturnType<typeof useGestureRecognition>;
  phase: GesturePhase;
}) {
  const s = ai.sample,
    d = s?.detection;
  return (
    <details className="gesture-diagnostics" onToggle={(e) => ai.setDebug(e.currentTarget.open)}>
      <summary>Diagnóstico de gestos</summary>
      {ai.debug && (
        <>
          <label>
            <input
              type="checkbox"
              checked={ai.observe}
              onChange={(e) => ai.setObserve(e.target.checked)}
            />{' '}
            Observar todas as fases sem executar comandos
          </label>
          <label>
            <input
              type="checkbox"
              checked={ai.overlay}
              onChange={(e) => ai.setOverlay(e.target.checked)}
            />{' '}
            Mostrar 21 pontos da mão
          </label>
          <p>
            {ai.backend} · {phase}
          </p>
          {ai.workerError && <p>Erro do worker: {ai.workerError}</p>}
          <p>
            Modelo: {d?.raw ?? '—'} · confiança {d?.rawScore?.toFixed(2) ?? '—'} · geometria:{' '}
            {d?.geometry ?? '—'}
          </p>
          <p>
            Validado: {s?.validated ?? '—'} · estabilidade {s?.stable ?? 0} ms
          </p>
          {d?.thumbMetrics && (
            <p>
              Polegar: extensão {d.thumbMetrics.straightRatio.toFixed(2)} · afastamento da palma{' '}
              {d.thumbMetrics.outwardRatio.toFixed(2)} · dedos flexionados{' '}
              {d.thumbMetrics.foldedFingers}/4
            </p>
          )}
          <p>
            {s?.hz.toFixed(1) ?? '—'} Hz · média por quadro {s?.ms.toFixed(1) ?? '—'} ms
          </p>
          <p>
            {s?.reason ?? 'Aguardando amostra'} · último comando: {ai.lastCommand ?? '—'}
          </p>
        </>
      )}
    </details>
  );
}
