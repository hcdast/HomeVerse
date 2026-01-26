import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Education, EducationDocument, Course, Grade } from './schemas/education.schema';

@Injectable()
export class EducationService {
  constructor(@InjectModel(Education.name) private eduModel: Model<EducationDocument>) {}

  async create(createDto: Partial<Education>): Promise<EducationDocument> {
    return new this.eduModel(createDto).save();
  }

  async findByFamily(familyId: string): Promise<EducationDocument[]> {
    return this.eduModel.find({ familyId })
      .populate('createdBy', 'username avatar')
      .populate('linkedUserId', 'username avatar')
      .sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<EducationDocument> {
    const edu = await this.eduModel.findById(id)
      .populate('createdBy', 'username avatar')
      .populate('linkedUserId', 'username avatar').exec();
    if (!edu) throw new NotFoundException('学生档案不存在');
    return edu;
  }

  async update(id: string, updateDto: Partial<Education>): Promise<EducationDocument> {
    const edu = await this.eduModel.findByIdAndUpdate(id, updateDto, { new: true });
    if (!edu) throw new NotFoundException('学生档案不存在');
    return edu;
  }

  async delete(id: string): Promise<void> {
    const result = await this.eduModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('学生档案不存在');
  }

  async addCourse(studentId: string, course: Partial<Course>): Promise<EducationDocument> {
    const edu = await this.eduModel.findById(studentId);
    if (!edu) throw new NotFoundException('学生档案不存在');
    edu.courses.push(course as any);
    return edu.save();
  }

  async addGrade(studentId: string, grade: Partial<Grade>): Promise<EducationDocument> {
    const edu = await this.eduModel.findById(studentId);
    if (!edu) throw new NotFoundException('学生档案不存在');
    edu.grades.push(grade as any);
    return edu.save();
  }

  async getStatistics(familyId: string): Promise<any> {
    const students = await this.eduModel.find({ familyId }).exec();
    let totalCourses = 0;
    let totalGrades = 0;
    let avgScore = 0;
    let gradeCount = 0;

    for (const student of students) {
      totalCourses += student.courses.length;
      totalGrades += student.grades.length;
      for (const grade of student.grades) {
        if (grade.fullScore) {
          avgScore += (grade.score / grade.fullScore) * 100;
          gradeCount++;
        }
      }
    }

    return {
      totalStudents: students.length,
      totalCourses,
      totalGrades,
      averageScore: gradeCount > 0 ? Math.round(avgScore / gradeCount) : 0,
    };
  }
}




