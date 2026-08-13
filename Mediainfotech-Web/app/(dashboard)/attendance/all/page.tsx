'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AllRecordsSubpageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/attendance');
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-400 text-xs">
      Redirecting to Attendance Workspace...
    </div>
  );
}
