import { Router } from 'express';
import { LeadController } from '../controllers/LeadController';
import { OpenAIService } from '../services/OpenAIService';
import { LeadRepository } from '../repositories/LeadRepository';

const router = Router();
const leadController = new LeadController();
const openAIService = new OpenAIService();
const leadRepo = new LeadRepository();

router.post('/', leadController.createLead);
router.get('/', leadController.getAllLeads);
router.get('/:id', leadController.getLeadById);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);
router.post('/:id/notes', leadController.addNote);

router.get('/:id/generate-script', async (req, res) => {
  try {
    const lead = await leadRepo.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const mode = (req.query.mode as any) || 'beginner';
    const script = await openAIService.generateCallScript(lead, mode);
    res.json(script);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
