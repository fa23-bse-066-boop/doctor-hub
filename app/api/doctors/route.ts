import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const specialization = searchParams.get('specialization');
    const treatmentType = searchParams.get('treatmentType');
    const isApproved = searchParams.get('isApproved') === 'true';

    const whereClause: any = { user: { isActive: true } };

    if (specialization) {
      whereClause.specialization = {
        contains: specialization,
        mode: 'insensitive',
      };
    }

    if (treatmentType) {
      whereClause.treatmentTypes = {
        hasSome: [treatmentType],
      };
    }

    if (isApproved !== undefined) {
      whereClause.isApproved = isApproved;
    }

    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        specialization: true,
        treatmentTypes: true,
        diseases: true,
        experience: true,
        bio: true,
        profilePic: true,
        isApproved: true,
        clinics: {
          select: {
            id: true,
            name: true,
            city: true,
            fee: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
      take: 50,
    });

    return NextResponse.json({ success: true, data: doctors }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch doctors' },
      { status: 500 }
    );
  }
}
