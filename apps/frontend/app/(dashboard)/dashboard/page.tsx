import { Suspense } from 'react';
import { ChatPanel } from '@/components/dashboard/ChatPanel';
import { CheckoutSuccessNotice } from '@/components/dashboard/CheckoutSuccessNotice';

export default function DashboardPage() {
  return (
    <>
      {/* useSearchParams needs a Suspense boundary in the app router. */}
      <Suspense fallback={null}>
        <CheckoutSuccessNotice />
      </Suspense>
      <ChatPanel />
    </>
  );
}
