import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/bcrypt';
import { signToken } from '@/lib/jwt';
import { setCookie } from '@/lib/cookies';
import { ApiResponse, AuthUser } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AuthUser>>> {
  try {
    const body = await request.json();
    const { email, password, fullName, role } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (role === 'PATIENT') {
      await prisma.patient.create({
        data: {
          userId: user.id,
          fullName,
        },
      });
    } else if (role === 'DOCTOR') {
      await prisma.doctor.create({
        data: {
          userId: user.id,
          fullName,
          specialization: '',
          treatmentTypes: [],
          diseases: [],
          qualifications: [],
          experience: 0,
        },
      });
    } else if (role === 'ASSISTANT') {
      return NextResponse.json(
        { success: false, error: 'Assistants cannot self-register' },
        { status: 400 }
      );
    }

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });
    await setCookie(token);

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
