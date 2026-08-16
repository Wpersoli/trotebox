'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/#acesso');
  }, [router]);

  return (
    <main className="login-redirect">
      <p>O acesso agora fica na página inicial.</p>
      <Link href="/#acesso" className="button">Ir para o acesso seguro</Link>
    </main>
  );
}
