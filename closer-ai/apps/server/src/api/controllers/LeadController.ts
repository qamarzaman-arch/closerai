import { Request, Response } from 'express';
import { LeadRepository } from '../../domain/repositories/LeadRepository';
import { LeadImportSchema, LeadResourceSchema, LeadSchema, LeadUpdateSchema } from '../../infrastructure/utils/schemas';
import logger from '../../infrastructure/utils/logger';

const leadRepository = new LeadRepository();

export class LeadController {
  async createLead(req: Request, res: Response) {
    try {
      const validatedData = LeadSchema.parse(req.body);
      const lead = await leadRepository.create(validatedData);
      logger.info('Lead created', { leadId: lead.id });
      res.status(201).json(lead);
    } catch (error: any) {
      logger.error('Error creating lead', { error: error.message });
      res.status(400).json({ error: error.message });
    }
  }

  async getAllLeads(req: Request, res: Response) {
    try {
      const { search, call_status } = req.query;
      const leads = await leadRepository.findAll({ search: search as string, call_status: call_status as string });
      res.json(leads);
    } catch (error: any) {
      logger.error('Error fetching leads', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  async getLeadById(req: Request, res: Response) {
    try {
      const lead = await leadRepository.findById(req.params.id as string);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateLead(req: Request, res: Response) {
    try {
      const validatedData = LeadUpdateSchema.parse(req.body);
      const lead = await leadRepository.update(req.params.id as string, validatedData);
      res.json(lead);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async importLeads(req: Request, res: Response) {
    try {
      const validatedData = LeadImportSchema.parse(req.body.leads || req.body);
      const result = await leadRepository.bulkCreate(validatedData);
      logger.info('Leads imported', { count: result.count });
      res.status(201).json({ imported: result.count });
    } catch (error: any) {
      logger.error('Error importing leads', { error: error.message });
      res.status(400).json({ error: error.message });
    }
  }

  async getAnalytics(req: Request, res: Response) {
    try {
      const analytics = await leadRepository.getAnalytics();
      res.json(analytics);
    } catch (error: any) {
      logger.error('Error fetching analytics', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  async deleteLead(req: Request, res: Response) {
    try {
      await leadRepository.delete(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async addNote(req: Request, res: Response) {
    try {
      if (!req.body.content?.trim()) {
        return res.status(400).json({ error: 'Note content is required' });
      }
      const note = await leadRepository.addNote(req.params.id as string, req.body.content);
      res.status(201).json(note);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async addResource(req: Request, res: Response) {
    try {
      const validatedData = LeadResourceSchema.parse(req.body);
      const resource = await leadRepository.addResource(req.params.id as string, validatedData);
      res.status(201).json(resource);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteResource(req: Request, res: Response) {
    try {
      const result = await leadRepository.deleteResource(req.params.id as string, req.params.resourceId as string);
      if (!result.count) return res.status(404).json({ error: 'Resource not found' });
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
