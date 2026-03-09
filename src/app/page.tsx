'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKernelStore } from '@/stores/kernel-store';
import Shell from '@/components/Shell';

export default function MainPage() {
  const router = useRouter();
  const { isLoggedIn } = useKernelStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoggedIn) {
      router.push('/login');
    }
  }, [mounted, isLoggedIn, router]);

  if (!mounted || !isLoggedIn) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-0">
        <div className="w-10 h-10 rounded-xl bg-accent animate-pulse-subtle" />
      </div>
    );
  }

  return <Shell />;
}
