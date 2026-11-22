import type { Admin } from './storage.ts';

type Candidate = { id: string; path: string; token: string };
type ExpiredBacklog = { count: number; oldestOverdueSeconds: number | null };

export async function purgePhoto(admin: Admin, row: Candidate) {
  let removed = false;
  try {
    removed = await admin.remove(row.path);
  } catch {
    // Keep the deletion claim recoverable by the scheduled job.
  }
  return (
    (await admin.rpc<boolean>('booth_ack_delete', {
      p_id: row.id,
      p_token: row.token,
      p_removed: removed,
    })) && removed
  );
}

export async function purgeRequestedPhoto(admin: Admin, id: string) {
  const rows = await admin.rpc<Candidate[]>('booth_claim_deletions', { p_id: id });
  return rows[0] ? purgePhoto(admin, rows[0]) : false;
}

export async function sweepPhotos(admin: Admin) {
  const token = await admin.rpc<string | null>('booth_claim_sweep');
  if (!token)
    return {
      busy: true,
      removed: 0,
      failed: 0,
      completedWithoutErrors: false,
      expiredBacklog: null,
      expiredQueueDrained: null,
    };
  let failed = 0;
  let removed = 0;
  const batch = async <T>(items: T[], remove: (item: T) => Promise<boolean>) => {
    for (let i = 0; i < items.length; i += 10) {
      const result = await Promise.allSettled(items.slice(i, i + 10).map(remove));
      for (const item of result) {
        if (item.status === 'fulfilled' && item.value) removed++;
        else failed++;
      }
    }
  };
  try {
    await batch(await admin.rpc<Candidate[]>('booth_claim_deletions'), (row) =>
      purgePhoto(admin, row),
    );
    await batch(await admin.rpc<{ path: string }[]>('booth_orphan_paths'), ({ path }) =>
      admin.remove(path),
    );
  } catch {
    failed++;
  } finally {
    await admin.rpc('booth_finish_sweep', { p_token: token, p_failures: failed });
  }
  let expiredBacklog: ExpiredBacklog | null = null;
  try {
    const backlog = await admin.rpc<ExpiredBacklog>('booth_expired_photo_backlog');
    expiredBacklog = { count: backlog.count, oldestOverdueSeconds: backlog.oldestOverdueSeconds };
  } catch {
    // Observability is separate from the sweep outcome recorded above.
  }
  return {
    busy: false,
    removed,
    failed,
    completedWithoutErrors: failed === 0,
    expiredBacklog,
    expiredQueueDrained: expiredBacklog === null ? null : expiredBacklog.count === 0,
  };
}
