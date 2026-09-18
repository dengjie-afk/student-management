import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TeacherBriefService } from './teacher-brief.service';

const parseStoredList = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
};

@Injectable()
export class SchoolService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TeacherBriefService) private readonly teacherBriefs: TeacherBriefService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { email, password } });
    if (!user) throw new ForbiddenException('Invalid demo credentials.');
    return { token: user.id, user: { id: user.id, name: user.name, role: user.role } };
  }
  async actor(id?: string) { return id ? this.prisma.user.findUnique({ where: { id } }) : null; }
  async dashboard(adminId: string) {
    const students = await this.prisma.student.findMany({ where: { ownerAdminId: adminId }, include: { creditLedger: true } });
    const mapped = students.map((student) => ({ ...student, creditBalance: student.creditLedger.reduce((sum, item) => sum + item.delta, 0) }));
    return { timezone: 'Australia/Melbourne', risks: mapped.filter((student) => student.creditBalance < 2).map((student) => ({ studentId: student.id, studentName: student.name, type: 'LOW_CREDIT', message: `${student.creditBalance} lesson credit remaining` })), students: mapped };
  }
  async student(adminId: string, studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, include: { creditLedger: true, enrollments: { where: { active: true }, include: { class: true } } } });
    if (!student) throw new NotFoundException('Student not found.');
    if (student.ownerAdminId !== adminId) throw new ForbiddenException('You may only view students assigned to you.');
    return { ...student, creditBalance: student.creditLedger.reduce((sum, item) => sum + item.delta, 0), isOwner: true, enrollments: student.enrollments.map((entry) => entry.class), availableClasses: await this.prisma.class.findMany() };
  }
  async enroll(adminId: string, studentId: string, classId: string) {
    const created = await this.prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId }, include: { creditLedger: true, enrollments: { where: { active: true }, include: { class: true } } } });
      const target = await tx.class.findUnique({ where: { id: classId }, include: { teacher: true } });
      if (!student) throw new NotFoundException('Student not found.'); if (!target) throw new NotFoundException('Class not found.');
      if (student.ownerAdminId !== adminId) throw new ForbiddenException('Only the owning admin may change this student.');
      if (student.creditLedger.reduce((sum, item) => sum + item.delta, 0) < 1) throw new ConflictException({ code: 'INSUFFICIENT_CREDIT', message: 'At least one lesson credit is required.' });
      if (student.enrollments.some((entry) => entry.classId === classId)) throw new ConflictException({ code: 'DUPLICATE_ENROLLMENT', message: 'Student is already in this class.' });
      if (await tx.enrollment.count({ where: { classId, active: true } }) >= target.capacity) throw new ConflictException({ code: 'CLASS_FULL', message: 'This class has reached capacity.' });
      if (student.enrollments.some((entry) => entry.class.dayOfWeek === target.dayOfWeek && entry.class.startMinute < target.endMinute && target.startMinute < entry.class.endMinute)) throw new ConflictException({ code: 'SCHEDULE_CONFLICT', message: 'This weekly class overlaps an existing enrollment.' });
      const enrollment = await tx.enrollment.create({ data: { id: crypto.randomUUID(), studentId, classId } });
      await tx.creditLedger.create({
        data: {
          id: crypto.randomUUID(),
          studentId,
          delta: -1,
          reason: `Weekly class assignment: ${target.title}`,
        },
      });
      return { enrollment, student, target };
    });

    const brief = await this.teacherBriefs.generate({
      studentName: created.student.name,
      learningGoal: created.student.learningGoal,
      notes: created.student.notes,
      classTitle: created.target.title,
      teacherName: created.target.teacher.name,
      weeklySchedule: `Day ${created.target.dayOfWeek}, ${created.target.startMinute}-${created.target.endMinute}`,
    });
    await this.prisma.teacherBrief.create({ data: { id: crypto.randomUUID(), enrollmentId: created.enrollment.id, studentId, fallback: brief.fallback, summary: brief.summary, learningGoal: brief.learningGoal, supportStrategies: JSON.stringify(brief.supportStrategies), firstLessonChecks: JSON.stringify(brief.firstLessonChecklist) } });
    return { enrollment: created.enrollment, brief };
  }
  async teacherToday(teacherId: string) {
    const classes = await this.prisma.class.findMany({ where: { teacherId }, include: { enrollments: { where: { active: true }, include: { student: { include: { creditLedger: true, briefs: true } } } } } });
    return {
      timezone: 'Australia/Melbourne',
      classes: classes.map((room) => ({
        ...room,
        students: room.enrollments.map((entry) => {
          const brief = entry.student.briefs.find((candidate) => candidate.enrollmentId === entry.id);
          return {
            ...entry.student,
            creditBalance: entry.student.creditLedger.reduce((sum, item) => sum + item.delta, 0),
            brief: brief ? {
              fallback: brief.fallback,
              summary: brief.summary,
              learningGoal: brief.learningGoal,
              supportStrategies: parseStoredList(brief.supportStrategies),
              firstLessonChecklist: parseStoredList(brief.firstLessonChecks),
            } : null,
          };
        }),
      })),
    };
  }
}
