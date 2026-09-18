import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { SchoolService } from './school.service';

class LoginDto { @IsString() email!: string; @IsString() password!: string; }
class EnrollDto { @IsString() classId!: string; }

@Controller()
export class AppController {
  constructor(@Inject(SchoolService) private readonly school: SchoolService) {}

  @Post('auth/login') login(@Body() body: LoginDto) { return this.school.login(body.email, body.password); }
  @Get('admin/dashboard-risk') async dashboard(@Headers('authorization') token?: string) { return this.school.dashboard(await this.actor(token, 'ADMIN')); }
  @Get('students/:id') async student(@Headers('authorization') token: string | undefined, @Param('id') id: string) { return this.school.student(await this.actor(token, 'ADMIN'), id); }
  @Post('students/:id/enrollments') async enroll(@Headers('authorization') token: string | undefined, @Param('id') id: string, @Body() body: EnrollDto) {
    return this.school.enroll(await this.actor(token, 'ADMIN'), id, body.classId);
  }
  @Get('teachers/me/today') async today(@Headers('authorization') token?: string) { return this.school.teacherToday(await this.actor(token, 'TEACHER')); }

  private async actor(token: string | undefined, role: 'ADMIN' | 'TEACHER') {
    const actor = await this.school.actor(token?.replace('Bearer ', ''));
    if (!actor || actor.role !== role) throw new HttpException('Unauthorised for this view.', HttpStatus.FORBIDDEN);
    return actor.id;
  }
}
