import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { ApiResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // TODO: Implement reset password logic (verify token, update password)

    return NextResponse.json(
      { success: true, data: { message: 'Password reset successfully' } },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 400 }
    );
  }
}
