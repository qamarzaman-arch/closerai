import { Request, Response } from 'express';
import { LeadRepository } from '../repositories/LeadRepository';
import { LeadSchema } from '../utils/schemas';
import logger from '../utils/logger';

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
      const lead = await leadRepository.update(req.params.id as string, req.body);
      res.json(lead);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
      const note = await leadRepository.addNote(req.params.id as string, req.body.content);
      res.status(201).json(note);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
