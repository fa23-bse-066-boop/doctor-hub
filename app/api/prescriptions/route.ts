import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPrescriptionSchema } from '@/lib/validations/schemas';
import { ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await requireAuth();
    const { appointmentId } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { appointmentId },
      select: {
        id: true,
        medicines: true,
        instructions: true,
        followUpDate: true,
        createdAt: true,
        doctor: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { success: false, error: 'Prescription not found' },
        { status: 404 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true, doctorId: true },
    });

    const patient = await prisma.patient.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (
      user.role === 'PATIENT' &&
      appointment?.patientId !== patient?.id
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: prescription }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prescription' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await requireRole(['DOCTOR']);

    const body = await request.json();
    const { appointmentId, medicines, instructions, followUpDate } = createPrescriptionSchema.parse(body);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { doctorId: true, status: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const doctor = await prisma.doctor.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (appointment.doctorId !== doctor?.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const existingPrescription = await prisma.prescription.findUnique({
      where: { appointmentId },
    });

    if (existingPrescription) {
      return NextResponse.json(
        { success: false, error: 'Prescription already exists for this appointment' },
        { status: 409 }
      );
    }

    const prescription = await prisma.prescription.create({
      data: {
        appointmentId,
        doctorId: doctor.id,
        medicines,
        instructions,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      },
      select: {
        id: true,
        medicines: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: prescription }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create prescription' },
      { status: 500 }
    );
  }
}
