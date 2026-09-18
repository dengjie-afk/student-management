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
  source: 'AI_COMPATIBLE_API' | 'RULE_TEMPLATE';
};

type TeacherBriefServiceOptions = {
  apiKey?: string;
  baseUrl?: string;
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
  private readonly baseUrl?: string;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: TeacherBriefServiceOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.AI_API_KEY;
    this.baseUrl = options.baseUrl ?? process.env.AI_BASE_URL;
    this.model = options.model ?? process.env.AI_CHAT_MODEL_NAME ?? 'qwen3.8-max';
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async generate(input: TeacherBriefInput): Promise<GeneratedTeacherBrief> {
    if (!this.apiKey || !this.baseUrl) return this.fallback(input);

    try {
      const response = await this.fetchFn(`${this.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `Create a concise first-lesson handoff card for a teacher. Use only facts in the supplied JSON. Do not invent diagnoses, medical claims, or family details. Return one JSON object matching this schema exactly: ${JSON.stringify(responseSchema)}`,
            },
            { role: 'user', content: JSON.stringify(input) },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) return this.fallback(input);
      const body = await response.json() as unknown;
      const content = teacherBriefSchema.parse(JSON.parse(this.outputText(body)));
      return { ...content, fallback: false, source: 'AI_COMPATIBLE_API' };
    } catch {
      // A handoff card must never block an otherwise valid enrollment.
      return this.fallback(input);
    }
  }

  private outputText(body: unknown): string {
    if (!body || typeof body !== 'object') throw new Error('AI provider returned an empty response.');
    const response = body as { choices?: Array<{ message?: { content?: unknown } }> };
    const text = response.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw new Error('AI provider response did not contain message content.');
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
