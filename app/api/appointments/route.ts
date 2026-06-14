import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAppointmentSchema } from '@/lib/validations/schemas';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await requireRole(['PATIENT', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const whereClause: any = {};

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
      whereClause.patientId = patient.id;
    } else if (user.role === 'DOCTOR') {
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
      whereClause.doctorId = doctor.id;
    }

    if (status) {
      whereClause.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      select: {
        id: true,
        dateTime: true,
        status: true,
        patientNotes: true,
        patient: {
          select: {
            fullName: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            fullName: true,
            specialization: true,
          },
        },
        clinic: {
          select: {
            name: true,
            city: true,
          },
        },
        payment: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { dateTime: 'desc' },
    });

    return NextResponse.json({ success: true, data: appointments }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await requireRole(['PATIENT']);

    const body = await request.json();
    const { doctorId, clinicId, dateTime, patientNotes } = createAppointmentSchema.parse(body);

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

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { isApproved: true },
    });

    if (!doctor?.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Doctor is not approved' },
        { status: 400 }
      );
    }

    const existingAppointment = await prisma.appointment.findUnique({
      where: {
        doctorId_clinicId_dateTime: {
          doctorId,
          clinicId,
          dateTime: new Date(dateTime),
        },
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { success: false, error: 'This slot is already booked' },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId,
        clinicId,
        dateTime: new Date(dateTime),
        patientNotes,
        status: 'PENDING',
      },
      select: {
        id: true,
        dateTime: true,
        status: true,
        clinic: { select: { name: true } },
        doctor: { select: { fullName: true } },
      },
    });

    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}
