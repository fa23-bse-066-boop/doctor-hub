import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateUserStatusSchema } from '@/lib/validations/schemas';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await requireRole(['ADMIN', 'SUPER_ADMIN']);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const logs = await prisma.adminLog.findMany({
      select: {
        id: true,
        action: true,
        targetId: true,
        details: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.adminLog.count();

    return NextResponse.json(
      {
        success: true,
        data: {
          logs,
          pagination: {
            total: totalCount,
            limit,
            offset,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin logs' },
      { status: 500 }
    );
  }
}

export async function GET_USERS(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await requireRole(['ADMIN', 'SUPER_ADMIN']);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const limit = parseInt(searchParams.get('limit') || '50');

    const users = await prisma.user.findMany({
      where: role ? { role } : {},
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PATCH_USER_STATUS(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const admin = await requireRole(['ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const body = await request.json();
    const { isActive } = updateUserStatusSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    await prisma.adminLog.create({
      data: {
        userId: admin.id,
        action: `User status updated to ${isActive ? 'active' : 'inactive'}`,
        targetId: id,
        details: {
          email: targetUser.email,
          isActive,
        },
      },
    });

    return NextResponse.json({ success: true, data: updatedUser }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update user status' },
      { status: 500 }
    );
  }
}
