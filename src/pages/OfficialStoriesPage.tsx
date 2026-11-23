import { useOutletContext } from 'react-router';
import { OfficialStoryQueue } from '../components/OfficialStoryQueue';
import type { AdminSessionContext } from './AdminPage';

export function OfficialStoriesPage() {
  const session = useOutletContext<AdminSessionContext>();
  return (
    <section className="admin-content" aria-labelledby="official-stories-title">
      <header className="admin-panel">
        <h1 id="official-stories-title" tabIndex={-1}>
          Stories oficiais
        </h1>
        <p>Revise as solicitações dos participantes e registre as publicações feitas pela equipe.</p>
      </header>
      <OfficialStoryQueue {...session} />
    </section>
  );
}
