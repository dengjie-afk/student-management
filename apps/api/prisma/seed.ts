process.env.DATABASE_URL ??= 'file:./student.db';
import { PrismaClient, Role } from '@prisma/client';
import { buildSeedStudents } from '../src/seed-data';

const prisma = new PrismaClient();

async function main() {
  await prisma.teacherBrief.deleteMany(); await prisma.enrollment.deleteMany(); await prisma.creditLedger.deleteMany(); await prisma.creditPackage.deleteMany(); await prisma.class.deleteMany(); await prisma.student.deleteMany(); await prisma.user.deleteMany();
  await prisma.user.createMany({ data: [
    { id: 'admin-ava', name: 'Ava Chen', email: 'ava@austin.edu', password: 'demo123', role: Role.ADMIN },
    { id: 'admin-noah', name: 'Noah Li', email: 'noah@austin.edu', password: 'demo123', role: Role.ADMIN },
    { id: 'admin-priya', name: 'Priya Shah', email: 'priya@austin.edu', password: 'demo123', role: Role.ADMIN },
    { id: 'teacher-luca', name: 'Luca Wong', email: 'luca@austin.edu', password: 'demo123', role: Role.TEACHER },
    { id: 'teacher-mia', name: 'Mia Carter', email: 'mia@austin.edu', password: 'demo123', role: Role.TEACHER },
    { id: 'teacher-ben', name: 'Ben Ortiz', email: 'ben@austin.edu', password: 'demo123', role: Role.TEACHER },
  ] });
  await prisma.class.createMany({ data: [
    { id: 'jazz-wed', title: 'Jazz Foundations', teacherId: 'teacher-luca', dayOfWeek: 3, startMinute: 1020, endMinute: 1080, capacity: 8 },
    { id: 'contemporary-wed', title: 'Contemporary Lab', teacherId: 'teacher-mia', dayOfWeek: 3, startMinute: 1050, endMinute: 1110, capacity: 8 },
    { id: 'hiphop-fri', title: 'Hip-Hop Foundation', teacherId: 'teacher-ben', dayOfWeek: 5, startMinute: 990, endMinute: 1050, capacity: 4 },
    { id: 'ballet-mon', title: 'Ballet Foundations', teacherId: 'teacher-mia', dayOfWeek: 1, startMinute: 960, endMinute: 1020, capacity: 10 },
    { id: 'lyrical-sat', title: 'Lyrical Basics', teacherId: 'teacher-ben', dayOfWeek: 6, startMinute: 900, endMinute: 960, capacity: 10 },
  ] });
  for (const student of buildSeedStudents()) {
    await prisma.student.create({ data: {
      id: student.id,
      name: student.name,
      ownerAdminId: student.ownerAdminId,
      learningGoal: student.learningGoal,
      notes: student.notes,
      creditLedger: { create: { id: `credit-${student.id}`, delta: student.creditDelta, reason: 'Seeded purchased lesson balance' } },
    } });
  }
  await prisma.enrollment.create({ data: { id: 'en-1', studentId: 'student-21', classId: 'jazz-wed' } });
  await prisma.enrollment.create({ data: { id: 'en-2', studentId: 'student-71', classId: 'contemporary-wed' } });
  await prisma.enrollment.create({ data: { id: 'en-3', studentId: 'student-121', classId: 'hiphop-fri' } });
}
main().finally(() => prisma.$disconnect());
