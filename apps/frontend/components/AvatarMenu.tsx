'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/stores/auth.store';
import {
  API_URL,
  removeAvatar,
  uploadAvatar,
  type AuthUser,
} from '@/lib/stores/auth';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const ACCEPTED_AVATAR_TYPES = 'image/png,image/jpeg,image/webp';

/** Avatar icon + upload/remove popover. Shared between the dashboard header
 * (`AccountBadge`) and the public Navbar — same account, same avatar,
 * wherever the user is logged in and browsing. */
export function AvatarMenu({ size = 28 }: { size?: number }) {
  const avatarUrl = useAuthStore((s) => s.user?.avatarUrl);
  const email = useAuthStore((s) => s.user?.email);
  const updateUser = useAuthStore((s) => s.updateUser);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getToken() {
    return useAuthStore.getState().accessToken;
  }
  function onRefreshed({
    accessToken,
    user,
  }: {
    accessToken: string;
    user: AuthUser;
  }) {
    useAuthStore.getState().setSession(accessToken, user);
  }
  function onSessionLost() {
    useAuthStore.getState().clearSession();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const result = await uploadAvatar(
        file,
        getToken,
        onRefreshed,
        onSessionLost,
      );
      updateUser({ avatarUrl: result.avatarUrl });
      setOpen(false);
    } catch {
      setError('Upload failed. Try a smaller image.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      await removeAvatar(getToken, onRefreshed, onSessionLost);
      updateUser({ avatarUrl: null });
      setOpen(false);
    } catch {
      setError('Could not remove avatar. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <PopoverTrigger
          aria-label="Avatar options"
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- cross-origin, user-uploaded image; not worth Next's image pipeline
            <img
              src={`${API_URL}${avatarUrl}`}
              alt="User avatar"
              width={size}
              height={size}
              style={{ width: size, height: size }}
              className="rounded-full object-cover"
            />
          ) : (
            <Image
              src="/userico.png"
              alt="User avatar"
              width={size}
              height={size}
              className="rounded-full"
            />
          )}
        </PopoverTrigger>

        <PopoverContent align="end" className="w-56">
          <div className="flex flex-col gap-2.5">
            {(avatarUrl || email) && (
              <div className="flex flex-col items-center gap-2 border-b border-border/60 pb-2.5">
                {avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- cross-origin, user-uploaded image; not worth Next's image pipeline
                  <img
                    src={`${API_URL}${avatarUrl}`}
                    alt="User avatar"
                    width={64}
                    height={64}
                    className="size-16 rounded-full object-cover"
                  />
                )}
                {email && (
                  <p className="w-full truncate text-center text-xs text-foreground/70">
                    {email}
                  </p>
                )}
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {busy
                ? 'Uploading…'
                : avatarUrl
                  ? 'Upload new avatar'
                  : 'Upload avatar'}
            </Button>
            {avatarUrl && (
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={handleRemove}
              >
                Delete avatar
              </Button>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </PopoverContent>
      </Popover>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_AVATAR_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
