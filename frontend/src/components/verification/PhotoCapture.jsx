// components/verification/PhotoCapture.jsx
// One photo slot (e.g. "CNIC front"). The user can:
//   • "Use camera"  → live camera preview in a dialog (laptop webcam or phone camera)
//   • "Upload photo" → pick a file from the computer / phone gallery
// On phones where the live camera isn't allowed (e.g. opened over plain http on
// your Wi-Fi), "Use camera" falls back to the phone's own camera app.
import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, RefreshCw, Check, ImageIcon, SwitchCamera } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

const MAX_MB = 8;
const canUseLiveCamera = () => typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

/** Guide drawn over the camera: a card outline for CNIC photos, an oval for the selfie. */
function CameraGuide({ shape }) {
  if (shape === 'face') {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[72%] aspect-[3/4] rounded-[50%] border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="w-[82%] aspect-[85.6/54] rounded-2xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
    </div>
  );
}

function CameraDialog({ open, onOpenChange, facing, shape, title, onCapture }) {
  const { t } = useLanguage();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState(facing);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setError('');
    setReady(false);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => setError(err.name === 'NotAllowedError' ? t('verify.cameraDenied') : t('verify.cameraUnavailable')));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [open, facingMode, t]);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    // The selfie preview is mirrored (like a mirror); save it the right way round.
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `${shape}-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        onOpenChange(false);
      },
      'image/jpeg',
      0.92,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{shape === 'face' ? t('verify.selfieGuide') : t('verify.cardGuide')}</DialogDescription>
        </DialogHeader>
        {/* Selfie: a taller frame on phones (held upright); CNIC: wide like the card. */}
        <div className={cn('relative overflow-hidden rounded-xl bg-black', shape === 'face' ? 'aspect-[3/4] max-h-[55dvh] sm:aspect-video sm:max-h-none' : 'aspect-video')}>
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/90">{error}</div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedData={() => setReady(true)}
                className={cn('h-full w-full object-cover', facingMode === 'user' && '-scale-x-100')}
              />
              <CameraGuide shape={shape} />
            </>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}>
            <SwitchCamera /> {t('verify.switchCamera')}
          </Button>
          <Button onClick={capture} disabled={!ready || !!error} size="lg">
            <Camera /> {t('verify.takePhoto')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * props:
 *  title, hint      text shown on the slot
 *  facing           'environment' (back camera, for the CNIC) | 'user' (front camera, for the selfie)
 *  shape            'card' | 'face'  (camera guide)
 *  value            File | null
 *  onChange(file)
 *  error            message shown under the slot
 */
export default function PhotoCapture({ title, hint, facing = 'environment', shape = 'card', value, onChange, error }) {
  const { t } = useLanguage();
  const fileRef = useRef(null);
  const nativeCameraRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!value) return setPreview(null);
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function accept(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setLocalError(t('verify.notImage'));
    if (file.size > MAX_MB * 1024 * 1024) return setLocalError(t('verify.tooBig', { mb: MAX_MB }));
    setLocalError('');
    onChange(file);
  }

  function openCamera() {
    if (canUseLiveCamera()) setCameraOpen(true);
    else nativeCameraRef.current?.click(); // phone camera app
  }

  const message = localError || error;

  return (
    <div>
      <div
        className={cn(
          'overflow-hidden rounded-2xl border-2 bg-card transition-colors',
          value ? 'border-success/40' : message ? 'border-destructive/60 border-dashed' : 'border-dashed border-input',
        )}
      >
        <div className={cn('relative flex items-center justify-center bg-sunken', shape === 'face' ? 'aspect-[4/3]' : 'aspect-[85.6/54]')}>
          {preview ? (
            <img src={preview} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-4 text-center text-muted-foreground">
              <ImageIcon className="size-8" />
              <span className="text-xs">{hint}</span>
            </div>
          )}
          {value && (
            <span className="absolute top-2 end-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[11px] font-bold text-white">
              <Check className="size-3" /> {t('verify.added')}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 p-3">
          <p className="text-sm font-semibold">{title}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={value ? 'outline' : 'default'} size="sm" onClick={openCamera}>
              {value ? <RefreshCw /> : <Camera />} {value ? t('verify.retake') : t('verify.useCamera')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload /> {t('verify.upload')}
            </Button>
          </div>
        </div>
      </div>
      {message && <p className="mt-1.5 text-xs font-medium text-destructive">{message}</p>}

      {/* gallery / file picker */}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
      {/* phone camera app (fallback when the live camera is not available) */}
      <input ref={nativeCameraRef} type="file" accept="image/*" capture={facing === 'user' ? 'user' : 'environment'} hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />

      {cameraOpen && (
        <CameraDialog open={cameraOpen} onOpenChange={setCameraOpen} facing={facing} shape={shape} title={title} onCapture={accept} />
      )}
    </div>
  );
}
