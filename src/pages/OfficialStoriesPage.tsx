import { useOutletContext } from 'react-router';
import { OfficialStoryQueue } from '../components/OfficialStoryQueue';
import { AdminSection, type AdminSessionContext } from './AdminPage';

export function OfficialStoriesPage() {
  const { token, onExpired } = useOutletContext<AdminSessionContext>();
  return (
    <>
      <AdminSection
        title="Stories oficiais"
        description="Revise as solicitações dos participantes e registre as publicações feitas pela equipe."
      />
      <OfficialStoryQueue token={token} onExpired={onExpired} />
    </>
  );
}
