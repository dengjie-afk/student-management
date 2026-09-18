process.env.DATABASE_URL ??= 'file:./student.db';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.teacherBrief.deleteMany(); await prisma.enrollment.deleteMany(); await prisma.creditLedger.deleteMany(); await prisma.creditPackage.deleteMany(); await prisma.class.deleteMany(); await prisma.student.deleteMany(); await prisma.user.deleteMany();
  await prisma.user.createMany({ data: [
    { id: 'admin-ava', name: 'Ava Chen', email: 'ava@austin.edu', password: 'demo123', role: Role.ADMIN },
    { id: 'admin-noah', name: 'Noah Li', email: 'noah@austin.edu', password: 'demo123', role: Role.ADMIN },
    { id: 'teacher-luca', name: 'Luca Wong', email: 'luca@austin.edu', password: 'demo123', role: Role.TEACHER },
  ] });
  await prisma.class.createMany({ data: [
    { id: 'jazz-wed', title: 'Jazz Foundations', teacherId: 'teacher-luca', dayOfWeek: 3, startMinute: 1020, endMinute: 1080, capacity: 8 },
    { id: 'contemporary-wed', title: 'Contemporary Lab', teacherId: 'teacher-luca', dayOfWeek: 3, startMinute: 1050, endMinute: 1110, capacity: 8 },
    { id: 'hiphop-fri', title: 'Hip-Hop Foundation', teacherId: 'teacher-luca', dayOfWeek: 5, startMinute: 990, endMinute: 1050, capacity: 4 },
  ] });
  const names = ['Mia Lin', 'Sienna Park', 'Aria Zhang', 'Ella Tran'];
  for (let index = 0; index < 36; index += 1) {
    const id = `student-${index + 1}`; const balance = index === 1 ? 0 : index === 2 ? 1 : 6;
    await prisma.student.create({ data: { id, name: `${names[index % names.length]}${index > 3 ? ` ${index + 1}` : ''}`, ownerAdminId: index < 24 ? 'admin-ava' : 'admin-noah', learningGoal: 'Build confidence in rhythm and coordinated movement.', notes: index === 0 ? 'Prefers a calm introduction and clear step-by-step cues.' : 'Enjoys collaborative practice.', creditLedger: { create: { id: `credit-${id}`, delta: balance, reason: 'Seeded purchased lesson balance' } } } });
  }
  await prisma.enrollment.create({ data: { id: 'en-1', studentId: 'student-1', classId: 'jazz-wed' } });
}
main().finally(() => prisma.$disconnect());
