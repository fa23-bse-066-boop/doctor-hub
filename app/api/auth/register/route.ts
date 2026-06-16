import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/bcrypt';
import { signToken } from '@/lib/jwt';
import { setCookie } from '@/lib/cookies';
import { ApiResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { email, password, fullName, phone, role } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email already exists',
        },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const transaction = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
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
        },
      });

      if (role === 'PATIENT') {
        await tx.patient.create({
          data: {
            userId: user.id,
            fullName,
            phone: phone || undefined,
          },
        });
      } else if (role === 'DOCTOR') {
        await tx.doctor.create({
          data: {
            userId: user.id,
            fullName,
            phone: phone || undefined,
            specialization: '',
            treatmentTypes: [],
            diseases: [],
            qualifications: [],
            experience: 0,
            isApproved: false,
          },
        });
      }

      return user;
    });

    const token = await signToken({
      userId: transaction.id,
      email: transaction.email,
      role: transaction.role,
    });

    await setCookie(token);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: transaction.id,
          email: transaction.email,
          role: transaction.role,
        },
        message: 'Registration successful',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

