// pages/admin/AdminVerifications.jsx — owners waiting for their CNIC + selfie to be checked.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { IdCard, Phone, MapPin, CircleCheck } from '@/components/icons';
import api, { apiError } from '@/api/client';
import { useLanguage } from '@/context/LanguageContext';
import { localPhone, timeAgo } from '@/lib/format';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/admin/Pagination';
import VerificationReview from '@/components/verification/VerificationReview';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const STATUS_BADGE = { pending: 'warning', approved: 'success', rejected: 'destructive' };

export default function AdminVerifications() {
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  useDocumentTitle(t('admin.verifications'));

  const load = useCallback(() => {
    api.get('/admin/verifications', { params: { status, page } })
      .then((r) => setData(r.data))
      .catch((err) => { toast.error(apiError(err)); setData({ items: [], total: 0, pages: 1, counts: {} }); });
  }, [status, page]);
  useEffect(() => { load(); }, [load]);

  const counts = data?.counts || {};

  return (
    <div>
      <h1 className="text-3xl font-extrabold">{t('admin.verifications')}</h1>
      <p className="mt-1 text-muted-foreground">{t('admin.verificationsSub')}</p>

      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); }} className="mt-6">
        <TabsList>
          {['pending', 'approved', 'rejected'].map((s) => (
            <TabsTrigger key={s} value={s}>
              {t(`verify.status.${s}`)} <span className="ltr-nums opacity-60">{counts[s] ?? ''}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-6 space-y-4">
        {data === null && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        {data?.items.length === 0 && (
          <EmptyState icon={status === 'pending' ? CircleCheck : IdCard} title={status === 'pending' ? t('admin.noPendingIds') : t('admin.noIds')} />
        )}
        {data?.items.map((u) => (
          <Card key={u.id} className="gap-4">
            <CardHeader className="flex flex-row flex-wrap items-center gap-3">
              <Avatar name={u.name} src={u.avatar} size="md" />
              <div className="min-w-0 flex-1">
                <Link to={`/admin/users?open=${u.id}`} className="font-bold hover:underline">{u.name}</Link>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {u.phone && <span className="inline-flex items-center gap-1 ltr-nums"><Phone className="size-3" /> {localPhone(u.phone)}</span>}
                  {u.place && <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {u.place}</span>}
                  <span className="ltr-nums">{t('auth.cnic')}: {u.cnicMasked || '—'}</span>
                  {u.verification?.submittedAt && <span>{t('admin.submitted', { when: timeAgo(u.verification.submittedAt, lang) })}</span>}
                </div>
              </div>
              <Badge variant={STATUS_BADGE[u.verification?.status] || 'secondary'}>{t(`verify.status.${u.verification?.status}`)}</Badge>
            </CardHeader>
            <CardContent>
              {u.verification?.status === 'rejected' && u.verification.rejectionReason && (
                <p className="mb-3 rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger">{u.verification.rejectionReason}</p>
              )}
              <VerificationReview user={u} onReviewed={() => load()} />
            </CardContent>
          </Card>
        ))}
      </div>
      {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />}
    </div>
  );
}
