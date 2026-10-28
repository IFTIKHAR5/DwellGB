// components/verification/DocumentImage.jsx — shows a PRIVATE identity photo to an admin.
// The image is fetched with the admin's login token (a normal <img src> can't send it).
import { useEffect, useState } from 'react';
import { ImageOff } from '@/components/icons';
import api from '@/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DocumentImage({ userId, kind, alt, className, onOpen }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    api
      .get(`/admin/users/${userId}/documents/${kind}`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, kind]);

  if (failed) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl bg-sunken text-muted-foreground', className)}>
        <ImageOff className="size-6" />
      </div>
    );
  }
  if (!url) return <Skeleton className={className} />;
  return (
    <button type="button" onClick={() => onOpen?.(url)} className={cn('overflow-hidden rounded-xl bg-sunken cursor-zoom-in', className)}>
      <img src={url} alt={alt} className="h-full w-full object-cover" />
    </button>
  );
}
