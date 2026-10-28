// pages/VerifyIdentity.jsx — owners upload (or re-upload) CNIC front, CNIC back and a selfie.
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck, ArrowRight } from '@/components/icons';
import api, { apiError, fieldErrors } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/Spinner';
import IdentityDocuments from '@/components/verification/IdentityDocuments';
import VerificationStatus from '@/components/verification/VerificationStatus';
import { appendDocuments, DOCUMENT_KINDS, EMPTY_DOCUMENTS, missingDocuments } from '@/lib/verification';
import useDocumentTitle from '@/hooks/useDocumentTitle';

export default function VerifyIdentity() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [docs, setDocs] = useState(EMPTY_DOCUMENTS);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useDocumentTitle(t('verify.pageTitle'));

  if (user?.role !== 'owner') return <Navigate to="/" replace />;
  const status = user.verification?.status;
  const canUpload = ['not_submitted', 'rejected'].includes(status);
  const done = DOCUMENT_KINDS.length - missingDocuments(docs).length;

  async function submit(e) {
    e.preventDefault();
    const missing = missingDocuments(docs);
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map((k) => [k, t('verify.required')])));
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/me/verification', appendDocuments(new FormData(), docs));
      updateUser(data);
      toast.success(t('verify.submitted'));
      navigate('/dashboard');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page max-w-3xl py-8 md:py-12">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-pine text-white"><ShieldCheck className="size-6" /></span>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{t('verify.pageTitle')}</h1>
          <p className="text-muted-foreground">{t('verify.pageSubtitle')}</p>
        </div>
      </div>

      <VerificationStatus verification={user.verification} showAction={false} className="mt-6" />

      {canUpload ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('verify.formTitle')}</CardTitle>
            <CardDescription>{t('verify.formText')}</CardDescription>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={(done / DOCUMENT_KINDS.length) * 100} className="flex-1" />
              <span className="text-xs font-semibold text-muted-foreground ltr-nums">{done}/{DOCUMENT_KINDS.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-6">
              <IdentityDocuments docs={docs} onChange={(d) => { setDocs(d); setErrors({}); }} errors={errors} />
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? <Spinner /> : <>{t('verify.submit')} <ArrowRight className="rtl:rotate-180" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 flex gap-3">
          <Button asChild><Link to="/dashboard">{t('nav.dashboard')}</Link></Button>
          <Button asChild variant="outline"><Link to="/dashboard/listings/new">{t('nav.newListing')}</Link></Button>
        </div>
      )}
    </div>
  );
}
