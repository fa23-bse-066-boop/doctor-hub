import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createMedicalHistorySchema } from '@/lib/validations/schemas';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await requireRole(['PATIENT', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN']);

    let medicalHistory;

    if (user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!patient) {
        return NextResponse.json(
          { success: false, error: 'Patient profile not found' },
          { status: 404 }
        );
      }

      medicalHistory = await prisma.medicalHistory.findMany({
        where: { patientId: patient.id },
        select: {
          id: true,
          diagnosis: true,
          doctorNotes: true,
          createdAt: true,
          doctor: {
            select: { fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      medicalHistory = await prisma.medicalHistory.findMany({
        where: { addedByDoctor: doctor?.id },
        select: {
          id: true,
          diagnosis: true,
          doctorNotes: true,
          createdAt: true,
          patient: {
            select: { fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      medicalHistory = await prisma.medicalHistory.findMany({
        select: {
          id: true,
          diagnosis: true,
          createdAt: true,
          patient: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    }

    return NextResponse.json({ success: true, data: medicalHistory }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch medical history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await requireRole(['DOCTOR']);

    const body = await request.json();
    const { appointmentId, diagnosis, doctorNotes } = createMedicalHistorySchema.parse(body);

    const doctor = await prisma.doctor.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    let patientId: string;

    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { patientId: true, doctorId: true },
      });

      if (!appointment) {
        return NextResponse.json(
          { success: false, error: 'Appointment not found' },
          { status: 404 }
        );
      }

      if (appointment.doctorId !== doctor.id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      patientId = appointment.patientId;
    } else {
      return NextResponse.json(
        { success: false, error: 'Appointment ID required' },
        { status: 400 }
      );
    }

    const medicalHistory = await prisma.medicalHistory.create({
      data: {
        patientId,
        appointmentId,
        diagnosis,
        doctorNotes,
        addedByDoctor: doctor.id,
      },
      select: {
        id: true,
        diagnosis: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: medicalHistory }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create medical history record' },
      { status: 500 }
    );
  }
}
