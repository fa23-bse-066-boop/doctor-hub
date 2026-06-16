'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // User is already logged in, redirect to their dashboard
      switch (user.role) {
        case 'PATIENT':
          router.push('/patient/dashboard');
          break;
        case 'DOCTOR':
          router.push('/doctor/dashboard');
          break;
        case 'ASSISTANT':
          router.push('/assistant/dashboard');
          break;
        case 'ADMIN':
          router.push('/admin/dashboard');
          break;
        case 'SUPER_ADMIN':
          router.push('/super-admin/dashboard');
          break;
        default:
          router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, don't render auth pages (redirect will happen)
  if (user) {
    return null;
  }

  // Render auth pages for non-authenticated users
  return <>{children}</>;
}
