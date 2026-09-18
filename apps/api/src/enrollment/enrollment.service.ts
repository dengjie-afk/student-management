export type RuleCode =
  | 'STUDENT_NOT_OWNED'
  | 'SCHEDULE_CONFLICT'
  | 'CLASS_NOT_FOUND'
  | 'STUDENT_NOT_FOUND'
  | 'CLASS_FULL'
  | 'INSUFFICIENT_CREDIT'
  | 'DUPLICATE_ENROLLMENT';

export class RuleViolation extends Error {
  constructor(public readonly code: RuleCode, message: string) {
    super(message);
  }
}

type Student = { id: string; ownerAdminId: string; creditBalance: number };
type ClassSchedule = {
  id: string;
  title: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  capacity: number;
  enrollmentCount: number;
};
type Enrollment = { id: string; studentId: string; classId: string; active: boolean };

export type EnrollmentStore = {
  students: Student[];
  classes: ClassSchedule[];
  enrollments: Enrollment[];
};

export class EnrollmentService {
  constructor(private readonly store: EnrollmentStore) {}

  async enroll(adminId: string, studentId: string, classId: string) {
    const student = this.store.students.find((candidate) => candidate.id === studentId);
    if (!student) throw new RuleViolation('STUDENT_NOT_FOUND', 'Student was not found.');
    if (student.ownerAdminId !== adminId) {
      throw new RuleViolation('STUDENT_NOT_OWNED', 'Only the owning admin may change this student.');
    }

    const targetClass = this.store.classes.find((candidate) => candidate.id === classId);
    if (!targetClass) throw new RuleViolation('CLASS_NOT_FOUND', 'Class was not found.');
    if (student.creditBalance < 1) {
      throw new RuleViolation('INSUFFICIENT_CREDIT', 'At least one available lesson credit is required.');
    }
    if (targetClass.enrollmentCount >= targetClass.capacity) {
      throw new RuleViolation('CLASS_FULL', 'This class has reached capacity.');
    }
    if (this.store.enrollments.some((enrollment) => enrollment.studentId === studentId && enrollment.classId === classId && enrollment.active)) {
      throw new RuleViolation('DUPLICATE_ENROLLMENT', 'The student is already enrolled in this class.');
    }

    const activeClasses = this.store.enrollments
      .filter((enrollment) => enrollment.studentId === studentId && enrollment.active)
      .map((enrollment) => this.store.classes.find((candidate) => candidate.id === enrollment.classId))
      .filter((candidate): candidate is ClassSchedule => Boolean(candidate));

    const conflicts = activeClasses.some((scheduledClass) =>
      scheduledClass.dayOfWeek === targetClass.dayOfWeek &&
      scheduledClass.startMinute < targetClass.endMinute &&
      targetClass.startMinute < scheduledClass.endMinute,
    );
    if (conflicts) throw new RuleViolation('SCHEDULE_CONFLICT', 'The student already has an overlapping weekly class.');

    const enrollment: Enrollment = { id: `enrollment-${this.store.enrollments.length + 1}`, studentId, classId, active: true };
    this.store.enrollments.push(enrollment);
    targetClass.enrollmentCount += 1;

    return {
      ...enrollment,
      brief: {
        fallback: true,
        summary: `${student.id} is joining ${targetClass.title}.`,
        learningGoal: 'Confirm the student\'s current confidence and establish the first small goal.',
        supportStrategies: ['Welcome the student by name.', 'Check comfort with the class pace.'],
        firstLessonChecklist: ['Introduce the routine.', 'Share a brief class expectation.'],
      },
    };
  }
}
