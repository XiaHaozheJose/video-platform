import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportType, ReportStatus } from '../entities/report.entity';
import { CreateReportDto, ProcessReportDto } from '../dto/report.dto';
import { DanmakuService } from '@modules/danmaku/services/danmaku.service';
import { CommentService } from '@modules/user/services/comment.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    private danmakuService: DanmakuService,
    private commentService: CommentService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createReportDto: CreateReportDto, userId: string): Promise<Report> {
    // 1. 检查是否已经举报过
    const existingReport = await this.reportRepository.findOne({
      where: {
        reporter: { id: userId },
        targetId: createReportDto.targetId,
        type: createReportDto.type,
      }
    });

    if (existingReport) {
      // 更新举报次数和原因
      existingReport.reportCount += 1;
      existingReport.reason = createReportDto.reason;
      existingReport.description = createReportDto.description;
      return await this.reportRepository.save(existingReport);
    }

    // 2. 创建新举报
    const report = this.reportRepository.create({
      ...createReportDto,
      reporter: { id: userId },
    });

    const savedReport = await this.reportRepository.save(report);

    // 3. 发送举报事件
    this.eventEmitter.emit('report.created', savedReport);

    return savedReport;
  }

  async process(id: string, processDto: ProcessReportDto): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['reporter']
    });

    if (!report) {
      throw new BadRequestException('举报不存在');
    }

    // 更新举报状态
    report.status = processDto.status;
    report.result = {
      processor: processDto.processorId,
      action: processDto.action,
      note: processDto.note,
      processedAt: new Date(),
    };

    // 根据举报类型处理内容
    if (processDto.status === ReportStatus.APPROVED) {
      await this.handleApprovedReport(report);
    }

    const updatedReport = await this.reportRepository.save(report);

    // 发送处理完成事件
    this.eventEmitter.emit('report.processed', updatedReport);

    return updatedReport;
  }

  private async handleApprovedReport(report: Report): Promise<void> {
    switch (report.type) {
      case ReportType.DANMAKU:
        await this.danmakuService.remove(report.targetId);
        break;
      case ReportType.COMMENT:
        await this.commentService.remove(report.targetId, report.reporter.id);
        break;
      // ... 处理其他类型
    }
  }

  async getReportStats(): Promise<{
    total: number;
    pending: number;
    byType: Record<ReportType, number>;
  }> {
    const [total, pending, typeStats] = await Promise.all([
      this.reportRepository.count(),
      this.reportRepository.count({ where: { status: ReportStatus.PENDING } }),
      this.reportRepository
        .createQueryBuilder('report')
        .select('report.type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('report.type')
        .getRawMany(),
    ]);

    const byType = typeStats.reduce((acc, { type, count }) => {
      acc[type] = parseInt(count);
      return acc;
    }, {} as Record<ReportType, number>);

    return { total, pending, byType };
  }
} 