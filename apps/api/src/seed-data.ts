export const ADMIN_IDS = ['admin-ava', 'admin-noah', 'admin-priya'] as const;
export const STUDENTS_PER_ADMIN = 50;
export const RISK_STUDENTS_PER_ADMIN = 20;

export type SeedStudent = {
  id: string;
  name: string;
  ownerAdminId: (typeof ADMIN_IDS)[number];
  creditDelta: number;
  learningGoal: string;
  notes: string;
};

const names = ['Mia Lin', 'Sienna Park', 'Aria Zhang', 'Ella Tran', 'Olivia Wu', 'James Ho'];

export function buildSeedStudents(): SeedStudent[] {
  return ADMIN_IDS.flatMap((ownerAdminId, adminIndex) =>
    Array.from({ length: STUDENTS_PER_ADMIN }, (_, studentIndex) => {
      const globalIndex = adminIndex * STUDENTS_PER_ADMIN + studentIndex + 1;
      const isRiskStudent = studentIndex < RISK_STUDENTS_PER_ADMIN;
      return {
        id: `student-${globalIndex}`,
        name: `${names[globalIndex % names.length]} ${globalIndex}`,
        ownerAdminId,
        // Alternating zero and one credits demonstrates both balance-risk cases.
        creditDelta: isRiskStudent ? studentIndex % 2 : 6,
        learningGoal: 'Build confidence in rhythm and coordinated movement.',
        notes: isRiskStudent
          ? 'Please review lesson-credit renewal with the family before the next class.'
          : 'Enjoys collaborative practice and clear step-by-step cues.',
      };
    }),
  );
}
