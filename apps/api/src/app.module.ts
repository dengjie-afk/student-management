import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { SchoolService } from './school.service';
import { PrismaService } from './prisma.service';
import { TeacherBriefService } from './teacher-brief.service';

@Module({ controllers: [AppController], providers: [PrismaService, SchoolService, TeacherBriefService] })
export class AppModule {}
