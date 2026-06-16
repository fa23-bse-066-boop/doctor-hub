'use client';

import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/login';

    switch (user.role) {
      case 'PATIENT':
        return '/patient/dashboard';
      case 'DOCTOR':
        return '/doctor/dashboard';
      case 'ASSISTANT':
        return '/assistant/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      case 'SUPER_ADMIN':
        return '/super-admin/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Icon */}
            <div className="p-3 bg-red-50 rounded-full">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>

            {/* Content */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Access Denied
              </h1>
              <p className="text-gray-600 mb-4">
                You don&apos;t have permission to view this page.
              </p>
              {user && (
                <p className="text-sm text-gray-500">
                  Current role: <span className="font-medium">{user.role}</span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 w-full mt-4">
              {user ? (
                <>
                  <Link href={getDashboardPath()} className="w-full">
                    <Button className="w-full bg-teal-600 hover:bg-teal-700">
                      Go to My Dashboard
                    </Button>
                  </Link>
                  <Button
                    onClick={logout}
                    variant="outline"
                    className="w-full"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Link href="/login" className="w-full">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700">
                    Go to Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
