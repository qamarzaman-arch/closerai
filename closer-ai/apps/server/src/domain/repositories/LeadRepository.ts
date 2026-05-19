import { PrismaClient, Lead } from '@prisma/client';

const prisma = new PrismaClient();

export class LeadRepository {
  async create(data: any): Promise<Lead> {
    return prisma.lead.create({ data });
  }

  async bulkCreate(rows: any[]) {
    const cleanedRows = rows.map(row => ({
      ...row,
      call_status: row.call_status || 'NEW',
      deal_score: row.deal_score || 0,
    }));

    const result = await prisma.lead.createMany({
      data: cleanedRows,
      skipDuplicates: true,
    });

    return result;
  }

  async findAll(filter: { search?: string, call_status?: string, skip?: number, take?: number } = {}): Promise<Lead[]> {
    const { search, call_status, skip = 0, take = 50 } = filter;
    let where: any = {};

    if (search) {
      where.OR = [
        { full_name: { contains: search } },
        { phone_number: { contains: search } },
        { property_address: { contains: search } },
      ];
    }

    if (call_status) {
      where.call_status = call_status;
    }

    return prisma.lead.findMany({
      where,
      skip,
      take,
      include: {
        resources: {
          orderBy: { updatedAt: 'desc' },
        },
        noteHistory: true,
        sessions: {
          take: 5, // Only load last 5 sessions for performance
          orderBy: { startTime: 'desc' },
          include: {
            objections: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findById(id: string): Promise<Lead | null> {
    return prisma.lead.findUnique({
      where: { id },
      include: {
        resources: {
          orderBy: { updatedAt: 'desc' },
        },
        noteHistory: true,
        sessions: {
          include: {
            transcript: true,
            suggestions: true,
            objections: true
          }
        }
      }
    });
  }

  async update(id: string, data: any): Promise<Lead> {
    return prisma.lead.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<Lead> {
    return prisma.$transaction(async (tx) => {
      const sessions = await tx.callSession.findMany({ where: { leadId: id }, select: { id: true } });
      const sessionIds = sessions.map(session => session.id);

      if (sessionIds.length) {
        await tx.objection.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.aISuggestion.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.transcript.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.callSession.deleteMany({ where: { id: { in: sessionIds } } });
      }

      await tx.leadResource.deleteMany({ where: { leadId: id } });
      await tx.note.deleteMany({ where: { leadId: id } });
      return tx.lead.delete({ where: { id } });
    });
  }

  async addNote(leadId: string, content: string) {
    return prisma.note.create({
      data: {
        leadId,
        content
      }
    });
  }

  async addResource(leadId: string, data: any) {
    return prisma.leadResource.create({
      data: {
        leadId,
        type: data.type || 'NOTE',
        title: data.title,
        url: data.url || null,
        content: data.content,
      },
    });
  }

  async deleteResource(leadId: string, resourceId: string) {
    return prisma.leadResource.deleteMany({
      where: {
        id: resourceId,
        leadId,
      },
    });
  }

  async getAnalytics() {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalLeads,
      totalCalls,
      totalObjections,
      dueFollowUps,
      statusGroups,
      recentLeads,
      recentSessions,
      averageScore,
      hotLeads,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.callSession.count(),
      prisma.objection.count(),
      prisma.lead.count({ where: { follow_up_date: { lte: todayEnd } } }),
      prisma.lead.groupBy({ by: ['call_status'], _count: { _all: true } }),
      prisma.lead.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.callSession.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.lead.aggregate({ _avg: { deal_score: true } }),
      prisma.lead.findMany({
        take: 5,
        orderBy: { deal_score: 'desc' },
        select: {
          id: true,
          full_name: true,
          phone_number: true,
          deal_score: true,
          call_status: true,
          follow_up_date: true,
        },
      }),
    ]);

    return {
      totalLeads,
      totalCalls,
      totalObjections,
      dueFollowUps,
      recentLeads,
      recentSessions,
      averageDealScore: Math.round(averageScore._avg.deal_score || 0),
      statusBreakdown: statusGroups.map(group => ({
        status: group.call_status,
        count: group._count._all,
      })),
      hotLeads,
    };
  }
}
