import { PrismaClient, Lead } from '@prisma/client';

const prisma = new PrismaClient();

export class LeadRepository {
  async create(data: any): Promise<Lead> {
    return prisma.lead.create({ data });
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
    return prisma.lead.delete({
      where: { id }
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
}
