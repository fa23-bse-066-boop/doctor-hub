import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCookies } from '@/lib/cookies';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

interface CurrentUserData {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  patient?: {
    fullName: string;
    profilePic: string | null;
  };
  doctor?: {
    fullName: string;
    profilePic: string | null;
    isApproved: boolean;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = await getTokenFromCookies();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        patient: {
          select: {
            fullName: true,
            profilePic: true,
          },
        },
        doctor: {
          select: {
            fullName: true,
            profilePic: true,
            isApproved: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account has been suspended' },
        { status: 401 }
      );
    }

    const responseData: CurrentUserData = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    if (user.role === 'PATIENT' && user.patient) {
      responseData.patient = user.patient;
    } else if (user.role === 'DOCTOR' && user.doctor) {
      responseData.doctor = user.doctor;
    }

    return NextResponse.json({ success: true, data: responseData }, { status: 200 });
  } catch (error) {
    console.error('Me route error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

