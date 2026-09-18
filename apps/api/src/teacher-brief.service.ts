import { Injectable } from '@nestjs/common';
import { z } from 'zod';

export const teacherBriefSchema = z.object({
  summary: z.string().min(10).max(280),
  learningGoal: z.string().min(5).max(240),
  supportStrategies: z.array(z.string().min(1).max(180)).min(2).max(4),
  firstLessonChecklist: z.array(z.string().min(1).max(180)).min(3).max(5),
}).strict();

export type TeacherBriefInput = {
  studentName: string;
  learningGoal: string;
  notes: string;
  classTitle: string;
  teacherName: string;
  weeklySchedule: string;
};

export type GeneratedTeacherBrief = z.infer<typeof teacherBriefSchema> & {
  fallback: boolean;
  source: 'OPENAI' | 'RULE_TEMPLATE';
};

type TeacherBriefServiceOptions = {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
};

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'learningGoal', 'supportStrategies', 'firstLessonChecklist'],
  properties: {
    summary: { type: 'string', minLength: 10, maxLength: 280 },
    learningGoal: { type: 'string', minLength: 5, maxLength: 240 },
    supportStrategies: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: { type: 'string', minLength: 1, maxLength: 180 },
    },
    firstLessonChecklist: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: { type: 'string', minLength: 1, maxLength: 180 },
    },
  },
};

@Injectable()
export class TeacherBriefService {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: TeacherBriefServiceOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.model = options.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async generate(input: TeacherBriefInput): Promise<GeneratedTeacherBrief> {
    if (!this.apiKey) return this.fallback(input);

    try {
      const response = await this.fetchFn('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: [
            {
              role: 'system',
              content: [{
                type: 'input_text',
                text: 'Create a concise first-lesson handoff card for a teacher. Use only facts in the supplied JSON. Do not invent diagnoses, medical claims, or family details. Return JSON matching the provided schema.',
              }],
            },
            { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'teacher_brief',
              strict: true,
              schema: responseSchema,
            },
          },
        }),
      });

      if (!response.ok) return this.fallback(input);
      const body = await response.json() as unknown;
      const content = teacherBriefSchema.parse(JSON.parse(this.outputText(body)));
      return { ...content, fallback: false, source: 'OPENAI' };
    } catch {
      // A handoff card must never block an otherwise valid enrollment.
      return this.fallback(input);
    }
  }

  private outputText(body: unknown): string {
    if (!body || typeof body !== 'object') throw new Error('OpenAI returned an empty response.');
    const response = body as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
    if (typeof response.output_text === 'string') return response.output_text;
    const text = response.output?.flatMap((item) => item.content ?? []).find((item) => typeof item.text === 'string')?.text;
    if (typeof text !== 'string') throw new Error('OpenAI response did not contain output text.');
    return text;
  }

  private fallback(input: TeacherBriefInput): GeneratedTeacherBrief {
    return {
      fallback: true,
      source: 'RULE_TEMPLATE',
      summary: `${input.studentName} is joining ${input.classTitle}. ${input.notes}`.trim(),
      learningGoal: input.learningGoal,
      supportStrategies: [
        'Welcome the student by name and explain the first activity.',
        'Offer one clear correction at a time and check the student pace.',
      ],
      firstLessonChecklist: [
        'Check the student confidence level at the start of class.',
        'Confirm the student has a safe movement space.',
        'Agree on one small, observable goal for the lesson.',
      ],
    };
  }
}
