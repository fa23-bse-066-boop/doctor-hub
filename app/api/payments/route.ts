import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPaymentSchema, verifyPaymentSchema } from '@/lib/validations/schemas';
import { ApiResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await requireRole(['PATIENT']);

    const body = await request.json();
    const { appointmentId, screenshotUrl, amount } = createPaymentSchema.parse(body);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        patientId: true,
        status: true,
        payment: {
          select: { id: true },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (appointment.patientId !== patient?.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (appointment.payment) {
      return NextResponse.json(
        { success: false, error: 'Payment already exists for this appointment' },
        { status: 409 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        appointmentId,
        screenshotUrl,
        amount,
        status: 'PENDING',
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'PAYMENT_UPLOADED' },
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to upload payment' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await requireRole(['ASSISTANT', 'ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const body = await request.json();
    const { status, rejectionReason } = verifyPaymentSchema.parse(body);

    const payment = await prisma.payment.findUnique({
      where: { id },
      select: { appointmentId: true },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status,
        rejectionReason,
        verifiedById: user.role === 'ASSISTANT' ? user.id : undefined,
      },
      select: {
        id: true,
        status: true,
        amount: true,
        createdAt: true,
      },
    });

    if (status === 'VERIFIED') {
      await prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: 'PAYMENT_VERIFIED' },
      });
    }

    return NextResponse.json({ success: true, data: updatedPayment }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
