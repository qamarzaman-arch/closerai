import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../../store/useAppStore';
import { API_BASE } from '../../config/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { AlertTriangle, Brain, Calendar, CheckCircle, ChevronRight, Copy, Download, ExternalLink, Globe, Edit3, FileText, Lightbulb, Link, Loader2, MessageSquare, Phone, Plus, RefreshCw, Save, Search, ShieldAlert, StickyNote, Target, Trash2, TrendingUp, Upload, User, X, Zap } from 'lucide-react';

type LeadForm = {
  full_name: string;
  phone_number: string;
  email: string;
  linkedin_url: string;
  website_url: string;
  property_address: string;
  property_type: string;
  estimated_value: string;
  seller_motivation: string;
  notes: string;
  call_status: string;
  follow_up_date: string;
};

const emptyForm: LeadForm = {
  full_name: '',
  phone_number: '',
  email: '',
  linkedin_url: '',
  website_url: '',
  property_address: '',
  property_type: '',
  estimated_value: '',
  seller_motivation: '',
  notes: '',
  call_status: 'NEW',
  follow_up_date: '',
};

const statusOptions = ['ALL', 'NEW', 'CONTACTED', 'FOLLOW_UP', 'QUALIFIED', 'NOT_INTERESTED'];

const LeadsView: React.FC = () => {
  const leads = useAppStore(state => state.leads);
  const { setLeads, setCurrentLead, setIsCalling } = useAppStore();
  const { startCall } = useWebSocket();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [formData, setFormData] = useState<LeadForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [noteText, setNoteText] = useState('');
  const [resourceForm, setResourceForm] = useState({ type: 'NOTE', title: '', url: '', content: '' });
  const [script, setScript] = useState<any | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  // research: Map<leadId, leadName> for background tracking
  const [researchingLeads, setResearchingLeads] = useState<Map<string, string>>(new Map());
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [researchModalData, setResearchModalData] = useState<{ lead: any; resource: any } | null>(null);

  const loadLeads = async () => {
    try {
      setLoadError('');
      const res = await axios.get(`${API_BASE}/api/leads`);
      setLeads(res.data);
      if (!selectedLeadId && res.data.length) setSelectedLeadId(res.data[0].id);
    } catch (error: any) {
      setLoadError(error.response?.data?.error || 'Could not load prospects. Check the MySQL database connection.');
    }
  };

  const loadLeadDetails = async (id: string) => {
    const res = await axios.get(`${API_BASE}/api/leads/${id}`);
    setSelectedLead(res.data);
  };

  useEffect(() => {
    loadLeads().catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedLeadId) loadLeadDetails(selectedLeadId).catch(console.error);
  }, [selectedLeadId]);

  const filteredLeads = useMemo(() => leads.filter(lead => {
    const matchesSearch = lead.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      || lead.phone_number.includes(searchTerm)
      || (lead.property_address || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || lead.call_status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [leads, searchTerm, statusFilter]);

  const openCreateForm = () => {
    setFormData(emptyForm);
    setFormError('');
    setFormMode('create');
  };

  const openEditForm = () => {
    if (!selectedLead) return;
    setFormData({
      full_name: selectedLead.full_name || '',
      phone_number: selectedLead.phone_number || '',
      email: selectedLead.email || '',
      linkedin_url: selectedLead.linkedin_url || '',
      website_url: selectedLead.website_url || '',
      property_address: selectedLead.property_address || '',
      property_type: selectedLead.property_type || '',
      estimated_value: selectedLead.estimated_value ? String(selectedLead.estimated_value) : '',
      seller_motivation: selectedLead.seller_motivation || '',
      notes: selectedLead.notes || '',
      call_status: selectedLead.call_status || 'NEW',
      follow_up_date: selectedLead.follow_up_date ? selectedLead.follow_up_date.slice(0, 10) : '',
    });
    setFormError('');
    setFormMode('edit');
  };

  const buildPayload = () => ({
    full_name: formData.full_name.trim(),
    phone_number: formData.phone_number.trim(),
    email: formData.email.trim() || null,
    linkedin_url: formData.linkedin_url.trim() || null,
    website_url: formData.website_url.trim() || null,
    property_address: formData.property_address.trim() || null,
    property_type: formData.property_type.trim() || null,
    estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
    seller_motivation: formData.seller_motivation.trim() || null,
    notes: formData.notes.trim() || null,
    call_status: formData.call_status,
    follow_up_date: formData.follow_up_date || null,
  });

  const handleSaveLead = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const payload = buildPayload();
    if (!payload.full_name || !payload.phone_number) {
      setFormError('Name and phone are required.');
      return;
    }

    try {
      const response = formMode === 'edit' && selectedLead
        ? await axios.put(`${API_BASE}/api/leads/${selectedLead.id}`, payload)
        : await axios.post(`${API_BASE}/api/leads`, payload);
      await loadLeads();
      setSelectedLeadId(response.data.id);
      setFormMode('closed');
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Could not save prospect.');
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    try {
      await axios.delete(`${API_BASE}/api/leads/${selectedLead.id}`);
      setSelectedLead(null);
      setSelectedLeadId(null);
      await loadLeads();
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Could not delete prospect with call history.');
    }
  };

  const handleQuickStatus = async (status: string) => {
    if (!selectedLead) return;
    const response = await axios.put(`${API_BASE}/api/leads/${selectedLead.id}`, { call_status: status });
    setSelectedLead(response.data);
    await loadLeads();
    setSuccessMessage(`Marked ${response.data.full_name} as ${status.replace('_', ' ')}.`);
  };

  const scheduleTomorrow = async () => {
    if (!selectedLead) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const response = await axios.put(`${API_BASE}/api/leads/${selectedLead.id}`, {
      call_status: 'FOLLOW_UP',
      follow_up_date: tomorrow.toISOString().slice(0, 10),
    });
    setSelectedLead(response.data);
    await loadLeads();
    setSuccessMessage(`Follow-up scheduled for ${response.data.full_name}.`);
  };

  const handleAddNote = async () => {
    if (!selectedLead || !noteText.trim()) return;
    await axios.post(`${API_BASE}/api/leads/${selectedLead.id}/notes`, { content: noteText.trim() });
    setNoteText('');
    await loadLeadDetails(selectedLead.id);
  };

  const handleAddResource = async () => {
    if (!selectedLead || !resourceForm.title.trim() || !resourceForm.content.trim()) return;
    await axios.post(`${API_BASE}/api/leads/${selectedLead.id}/resources`, {
      type: resourceForm.type,
      title: resourceForm.title.trim(),
      url: resourceForm.url.trim() || null,
      content: resourceForm.content.trim(),
    });
    setResourceForm({ type: 'NOTE', title: '', url: '', content: '' });
    await loadLeadDetails(selectedLead.id);
    setSuccessMessage('Research context saved for AI scripts.');
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!selectedLead) return;
    await axios.delete(`${API_BASE}/api/leads/${selectedLead.id}/resources/${resourceId}`);
    await loadLeadDetails(selectedLead.id);
  };

  const handleGenerateScript = async () => {
    if (!selectedLead) return;
    setIsGeneratingScript(true);
    try {
      const response = await axios.get(`${API_BASE}/api/leads/${selectedLead.id}/generate-script?mode=beginner`);
      setScript(response.data);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleResearch = (lead: any) => {
    if (!lead || researchingLeads.has(lead.id)) return;
    // Add to background tracking — non-blocking, user can navigate away
    setResearchingLeads(prev => new Map(prev).set(lead.id, lead.full_name));
    axios.post(`${API_BASE}/api/leads/${lead.id}/research`)
      .then(async () => {
        const res = await axios.get(`${API_BASE}/api/leads/${lead.id}`);
        const updatedLead = res.data;
        // If this lead is still selected, refresh it
        if (selectedLeadId === lead.id) setSelectedLead(updatedLead);
        // Auto-open modal with result
        const aiResource = updatedLead.resources?.find((r: any) => r.type === 'AI_RESEARCH');
        if (aiResource) {
          setResearchModalData({ lead: updatedLead, resource: aiResource });
          setShowResearchModal(true);
        }
      })
      .catch(() => setLoadError(`AI research failed for ${lead.full_name}.`))
      .finally(() => setResearchingLeads(prev => { const m = new Map(prev); m.delete(lead.id); return m; }));
  };

  const openResearchModal = (lead: any) => {
    const aiResource = lead.resources?.find((r: any) => r.type === 'AI_RESEARCH');
    if (aiResource) {
      setResearchModalData({ lead, resource: aiResource });
      setShowResearchModal(true);
    }
  };

  const handleStartCall = (lead: any) => {
    setCurrentLead(lead);
    setIsCalling(true);
    startCall(lead.id);
  };

  const exportCsv = () => {
    const rows = filteredLeads.map((lead: any) => ({
      name: lead.full_name,
      phone: lead.phone_number,
      email: lead.email || '',
      linkedin: lead.linkedin_url || '',
      website: lead.website_url || '',
      status: lead.call_status || '',
      property: lead.property_address || '',
      motivation: lead.seller_motivation || lead.motivation_tags || '',
      score: Math.round(Number(lead.deal_score || 0)),
      follow_up: lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString() : '',
    }));
    const headers = Object.keys(rows[0] || { name: '', phone: '', email: '', status: '', property: '', motivation: '', score: '', follow_up: '' });
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(header => `"${String((row as any)[header]).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'closer-ai-prospects.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string) => {
    const rows: string[][] = [];
    let current = '';
    let row: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') i++;
        row.push(current.trim());
        if (row.some(cell => cell.length)) rows.push(row);
        row = [];
        current = '';
      } else {
        current += char;
      }
    }

    row.push(current.trim());
    if (row.some(cell => cell.length)) rows.push(row);
    if (rows.length < 2) return [];

    const headers = rows[0].map(header => header.toLowerCase().replace(/\s+/g, '_'));
    return rows.slice(1).map(cells => {
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = cells[index] || '';
      });

      const estimatedValue = record.estimated_value || record.value;
      return {
        full_name: record.full_name || record.name,
        phone_number: record.phone_number || record.phone,
        email: record.email || null,
        linkedin_url: record.linkedin_url || record.linkedin || record.profile || null,
        website_url: record.website_url || record.website || null,
        property_address: record.property_address || record.property || null,
        property_type: record.property_type || null,
        estimated_value: estimatedValue ? Number(String(estimatedValue).replace(/[^0-9.]/g, '')) : null,
        seller_motivation: record.seller_motivation || record.motivation || null,
        notes: record.notes || null,
        call_status: record.status || record.call_status || 'NEW',
        follow_up_date: record.follow_up || record.follow_up_date || null,
      };
    }).filter(row => row.full_name && row.phone_number);
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoadError('');
    setSuccessMessage('');

    try {
      const text = await file.text();
      const leadsToImport = parseCsv(text);
      if (!leadsToImport.length) {
        setLoadError('No valid prospects found. CSV needs name/full_name and phone/phone_number columns.');
        return;
      }
      const response = await axios.post(`${API_BASE}/api/leads/import`, { leads: leadsToImport });
      setSuccessMessage(`Imported ${response.data.imported} prospects from ${file.name}.`);
      await loadLeads();
    } catch (error: any) {
      setLoadError(error.response?.data?.error || 'Could not import CSV.');
    } finally {
      event.target.value = '';
    }
  };

  const closeLeadModal = () => { setSelectedLead(null); setSelectedLeadId(null); setScript(null); };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">

      {/* ── Background research toast ── */}
      {researchingLeads.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-2">
          {Array.from(researchingLeads.entries()).map(([id, name]) => (
            <div key={id} className="flex items-center gap-3 bg-gray-800 border border-purple-500/40 rounded-2xl px-4 py-3 shadow-2xl shadow-black/40">
              <Loader2 size={14} className="text-purple-400 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-black text-white">Researching {name}</p>
                <p className="text-[10px] text-gray-500">Runs in background — opens when ready</p>
              </div>
              <button onClick={() => setResearchingLeads(prev => { const m = new Map(prev); m.delete(id); return m; })} className="text-gray-600 hover:text-gray-400 ml-1"><X size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {/* ── Lead Create/Edit form modal ── */}
      {formMode !== 'closed' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-2xl bg-[#0f1623] border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">
            <LeadFormPanel mode={formMode} formData={formData} formError={formError} setFormData={setFormData} onSave={handleSaveLead} onCancel={() => setFormMode('closed')} />
          </div>
        </div>
      )}

      {/* ── AI Research full-page modal ── */}
      {showResearchModal && researchModalData && (
        <ResearchModal
          lead={researchModalData.lead}
          resource={researchModalData.resource}
          onClose={() => setShowResearchModal(false)}
          onRegenerate={() => { setShowResearchModal(false); handleResearch(researchModalData.lead); }}
          onDelete={async () => { await handleDeleteResource(researchModalData.resource.id); setShowResearchModal(false); }}
        />
      )}

      {/* ── Lead Detail modal ── */}
      {selectedLead && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl max-h-[92vh] bg-[#0f1623] border border-gray-700/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 font-black text-xl">
                  {selectedLead.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{selectedLead.full_name}</h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm text-gray-400 font-bold">{selectedLead.phone_number}</span>
                    <StatusBadge status={selectedLead.call_status} />
                    {selectedLead.deal_score != null && (
                      <span className="flex items-center gap-1 text-green-400 text-xs font-black">
                        <TrendingUp size={11} /> {Math.round(Number(selectedLead.deal_score))}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleStartCall(selectedLead)} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-black uppercase">
                  <Phone size={15} /> Call Now
                </button>
                <button onClick={closeLeadModal} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all"><X size={18} /></button>
              </div>
            </div>

            {/* Modal body — scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-0 divide-x divide-gray-800">

                {/* LEFT column */}
                <div className="p-6 space-y-5">
                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <ActionButton icon={<Edit3 size={14} />} label="Edit" onClick={openEditForm} />
                    <ActionButton
                      icon={researchingLeads.has(selectedLead.id) ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                      label={researchingLeads.has(selectedLead.id) ? 'Running...' : 'AI Research'}
                      onClick={() => handleResearch(selectedLead)}
                      highlight
                    />
                    <ActionButton icon={<FileText size={14} />} label={isGeneratingScript ? 'Loading...' : 'Script'} onClick={handleGenerateScript} />
                  </div>

                  {/* Quick status */}
                  <div className="bg-gray-900/50 border border-gray-700/40 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-3">Quick Status</p>
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton icon={<Phone size={13} />} label="Contacted" onClick={() => handleQuickStatus('CONTACTED')} />
                      <ActionButton icon={<TrendingUp size={13} />} label="Qualified" onClick={() => handleQuickStatus('QUALIFIED')} />
                      <ActionButton icon={<Calendar size={13} />} label="Follow Up Tomorrow" onClick={scheduleTomorrow} />
                      <ActionButton icon={<X size={13} />} label="Not Interested" onClick={() => handleQuickStatus('NOT_INTERESTED')} danger />
                    </div>
                  </div>

                  {/* Info fields */}
                  <div className="space-y-3">
                    <DetailRow icon={<Globe size={13} />} label="Property" value={selectedLead.property_address || '—'} />
                    <DetailRow icon={<Target size={13} />} label="Type" value={selectedLead.property_type || '—'} />
                    <DetailRow icon={<TrendingUp size={13} />} label="Est. Value" value={selectedLead.estimated_value ? `$${Number(selectedLead.estimated_value).toLocaleString()}` : '—'} />
                    <DetailRow icon={<Zap size={13} />} label="Motivation" value={selectedLead.seller_motivation || selectedLead.motivation_tags || '—'} />
                    <DetailRow icon={<Calendar size={13} />} label="Follow Up" value={selectedLead.follow_up_date ? new Date(selectedLead.follow_up_date).toLocaleDateString() : '—'} />
                    {selectedLead.linkedin_url && (
                      <div className="flex items-start gap-3 bg-gray-900/40 border border-gray-700/30 rounded-xl p-3">
                        <ExternalLink size={13} className="text-blue-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase text-gray-500 mb-0.5">LinkedIn</p>
                          <a href={selectedLead.linkedin_url} className="text-xs text-blue-300 truncate block hover:underline">{selectedLead.linkedin_url}</a>
                        </div>
                      </div>
                    )}
                    {selectedLead.website_url && (
                      <div className="flex items-start gap-3 bg-gray-900/40 border border-gray-700/30 rounded-xl p-3">
                        <Link size={13} className="text-blue-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase text-gray-500 mb-0.5">Website</p>
                          <a href={selectedLead.website_url} className="text-xs text-blue-300 truncate block hover:underline">{selectedLead.website_url}</a>
                        </div>
                      </div>
                    )}
                    {selectedLead.notes && (
                      <div className="bg-gray-900/40 border border-gray-700/30 rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Profile Notes</p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedLead.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* AI Research card */}
                  {(selectedLead.resources || []).filter((r: any) => r.type === 'AI_RESEARCH').map((resource: any) => (
                    <div key={resource.id} className="border border-purple-500/40 bg-purple-900/10 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain size={14} className="text-purple-400" />
                          <p className="text-xs font-black uppercase text-purple-400">AI Research Ready</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openResearchModal(selectedLead)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-black uppercase">
                            View Full <ChevronRight size={10} />
                          </button>
                          <button onClick={() => handleDeleteResource(resource.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Call Script */}
                  {script && (
                    <div className="bg-gray-900/60 border border-blue-500/20 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase text-blue-400 flex items-center gap-2"><FileText size={13} /> Call Script</h4>
                        <button onClick={() => setScript(null)} className="text-gray-600 hover:text-gray-400"><X size={14} /></button>
                      </div>
                      {['opening', 'rapport', 'pitch', 'pain_points', 'objections', 'closing', 'follow_up', 'personalization_notes'].map(key => {
                        const val = script[key];
                        if (!val) return null;
                        const isArray = Array.isArray(val);
                        const isObj = !isArray && typeof val === 'object';
                        return (
                          <div key={key} className="bg-gray-800/50 rounded-xl p-3">
                            <p className="text-[10px] font-black uppercase text-blue-300/70 mb-1.5">{key.replace(/_/g, ' ')}</p>
                            {isArray ? (
                              <ul className="space-y-1.5">
                                {val.map((item: any, i: number) => (
                                  <li key={i} className="flex gap-2 text-sm text-white">
                                    <span className="text-blue-400 shrink-0">→</span>
                                    {typeof item === 'object' ? JSON.stringify(item) : item}
                                  </li>
                                ))}
                              </ul>
                            ) : isObj ? (
                              <ul className="space-y-1.5">
                                {Object.entries(val).map(([k, v]) => (
                                  <li key={k} className="text-sm text-white">
                                    <span className="text-blue-400 font-bold uppercase text-[10px]">{k.replace(/_/g, ' ')}: </span>
                                    {String(v)}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-white font-medium leading-relaxed">{String(val)}</p>
                            )}
                          </div>
                        );
                      })}
                      {script.research_used && (
                        <details className="mt-1">
                          <summary className="text-[10px] font-black uppercase text-gray-500 cursor-pointer hover:text-gray-400">Research Used</summary>
                          <p className="text-xs text-gray-400 mt-1.5 whitespace-pre-wrap">{script.research_used}</p>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Danger zone */}
                  <div className="pt-2">
                    <button onClick={handleDeleteLead} className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 rounded-xl text-xs font-black uppercase transition-all">
                      <Trash2 size={13} /> Delete Prospect
                    </button>
                  </div>
                </div>

                {/* RIGHT column */}
                <div className="p-6 space-y-5">

                  {/* Notes */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-2"><StickyNote size={13} /> Notes</h4>
                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                      {(selectedLead.noteHistory || []).length === 0 && (
                        <p className="text-sm text-gray-600">No notes yet.</p>
                      )}
                      {(selectedLead.noteHistory || []).map((note: any) => (
                        <div key={note.id} className="text-sm text-gray-300 border-l-2 border-blue-500/40 pl-3 py-1">{note.content}</div>
                      ))}
                    </div>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." rows={3} className="w-full bg-gray-900 border border-gray-700/50 rounded-xl px-3 py-2.5 text-sm text-white resize-none focus:border-blue-500 outline-none" />
                    <button onClick={handleAddNote} className="mt-2 w-full bg-gray-700 hover:bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase transition-all">Add Note</button>
                  </div>

                  {/* Resources */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-2"><Globe size={13} /> Research Context</h4>
                    <div className="space-y-2 mb-3">
                      {(selectedLead.resources || []).filter((r: any) => r.type !== 'AI_RESEARCH').map((resource: any) => (
                        <div key={resource.id} className="border border-gray-700/50 bg-gray-800/40 rounded-xl p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase text-blue-400">{resource.type}</p>
                              <p className="text-sm font-bold text-white">{resource.title}</p>
                            </div>
                            <button onClick={() => handleDeleteResource(resource.id)} className="text-gray-600 hover:text-red-400 shrink-0"><Trash2 size={13} /></button>
                          </div>
                          {resource.url && <a href={resource.url} className="text-xs text-blue-300 flex items-center gap-1 mt-1 truncate"><ExternalLink size={11} /> {resource.url}</a>}
                          <p className="text-xs text-gray-400 mt-1 line-clamp-3">{resource.content}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={resourceForm.type} onChange={e => setResourceForm({ ...resourceForm, type: e.target.value })} className="bg-gray-900 border border-gray-700/50 rounded-xl px-3 py-2 text-xs text-white">
                          {['NOTE', 'LINKEDIN', 'WEBSITE', 'PROFILE', 'OTHER'].map(t => <option key={t}>{t}</option>)}
                        </select>
                        <input value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })} placeholder="Title" className="bg-gray-900 border border-gray-700/50 rounded-xl px-3 py-2 text-xs text-white" />
                      </div>
                      <input value={resourceForm.url} onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })} placeholder="URL (optional)" className="w-full bg-gray-900 border border-gray-700/50 rounded-xl px-3 py-2 text-xs text-white" />
                      <textarea value={resourceForm.content} onChange={e => setResourceForm({ ...resourceForm, content: e.target.value })} placeholder="Notes, profile details, pain points, context for AI..." rows={3} className="w-full bg-gray-900 border border-gray-700/50 rounded-xl px-3 py-2 text-xs text-white resize-none outline-none focus:border-blue-500" />
                      <button onClick={handleAddResource} className="w-full bg-gray-700 hover:bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase transition-all">Save Context</button>
                    </div>
                  </div>

                  {/* Call history */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-2"><Calendar size={13} /> Call History</h4>
                    {(selectedLead.sessions || []).length === 0
                      ? <p className="text-sm text-gray-600">No calls yet.</p>
                      : (selectedLead.sessions || []).map((session: any) => (
                          <div key={session.id} className="bg-gray-900/50 border border-gray-700/40 rounded-xl p-3 mb-2">
                            <p className="text-xs font-black text-white">{session.outcome || 'Session in progress'}</p>
                            <p className="text-[10px] text-gray-500">{new Date(session.startTime).toLocaleString()}</p>
                            {session.objections?.length > 0 && <p className="text-[10px] text-yellow-400 mt-1">{session.objections.length} objections</p>}
                          </div>
                        ))
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main list ── */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black tracking-tighter text-white">Prospects</h2>
          <div className="flex gap-3">
            <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
            <button onClick={() => importInputRef.current?.click()} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2"><Upload size={15} /> Import</button>
            <button onClick={exportCsv} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2"><Download size={15} /> Export</button>
            <button onClick={openCreateForm} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2"><Plus size={15} /> New Prospect</button>
          </div>
        </div>

        {loadError && <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm font-bold">{loadError}</div>}
        {successMessage && <div className="mb-5 bg-green-500/10 border border-green-500/30 text-green-300 rounded-xl p-4 text-sm font-bold">{successMessage}</div>}

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
            <input type="text" placeholder="Search name, phone, or property" className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm font-bold focus:outline-none focus:border-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-800 border border-gray-700/50 rounded-xl px-3 text-sm text-white font-bold">
            {statusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLeads.map(lead => (
            <button
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className="text-left bg-gray-800/40 border border-gray-700/50 hover:border-blue-500/60 hover:bg-gray-800 rounded-2xl p-5 transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 font-black shrink-0">
                    {lead.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-white truncate group-hover:text-blue-300 transition-colors">{lead.full_name}</h3>
                    <p className="text-xs text-gray-500 font-bold truncate">{lead.phone_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-green-400 font-black text-xs">{Math.round(Number(lead.deal_score || 0))}%</span>
                  <StatusBadge status={lead.call_status} />
                </div>
              </div>
              {lead.property_address && (
                <p className="text-xs text-gray-500 truncate mb-2 flex items-center gap-1.5"><Globe size={11} className="shrink-0" /> {lead.property_address}</p>
              )}
              {(lead.seller_motivation || lead.motivation_tags) && (
                <p className="text-xs text-blue-400/80 truncate mb-2 flex items-center gap-1.5"><Zap size={11} className="shrink-0" /> {lead.seller_motivation || lead.motivation_tags}</p>
              )}
              {lead.follow_up_date && (
                <p className="text-[10px] text-yellow-400 font-black uppercase flex items-center gap-1.5 mt-1"><Calendar size={10} /> Follow up {new Date(lead.follow_up_date).toLocaleDateString()}</p>
              )}
              {researchingLeads.has(lead.id) && (
                <div className="flex items-center gap-1.5 mt-2 text-purple-400 text-[10px] font-black uppercase">
                  <Loader2 size={10} className="animate-spin" /> Researching...
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const LeadFormPanel = ({ mode, formData, formError, setFormData, onSave, onCancel }: any) => (
  <form onSubmit={onSave} className="mb-8 bg-gray-800/40 border border-gray-700/50 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
    <h3 className="md:col-span-2 text-sm font-black uppercase text-blue-400">{mode === 'edit' ? 'Edit Prospect' : 'Create Prospect'}</h3>
    <Field placeholder="Full name" value={formData.full_name} onChange={(value: string) => setFormData({ ...formData, full_name: value })} />
    <Field placeholder="Phone number" value={formData.phone_number} onChange={(value: string) => setFormData({ ...formData, phone_number: value })} />
    <Field placeholder="Email" value={formData.email} onChange={(value: string) => setFormData({ ...formData, email: value })} />
    <Field placeholder="LinkedIn or profile URL" value={formData.linkedin_url} onChange={(value: string) => setFormData({ ...formData, linkedin_url: value })} />
    <Field placeholder="Website URL" value={formData.website_url} onChange={(value: string) => setFormData({ ...formData, website_url: value })} />
    <Field placeholder="Property address" value={formData.property_address} onChange={(value: string) => setFormData({ ...formData, property_address: value })} />
    <Field placeholder="Property type" value={formData.property_type} onChange={(value: string) => setFormData({ ...formData, property_type: value })} />
    <Field placeholder="Estimated value" type="number" value={formData.estimated_value} onChange={(value: string) => setFormData({ ...formData, estimated_value: value })} />
    <textarea placeholder="Seller motivation" value={formData.seller_motivation} onChange={(e) => setFormData({ ...formData, seller_motivation: e.target.value })} className="md:col-span-2 bg-gray-900 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white min-h-20" />
    <textarea placeholder="Profile notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="md:col-span-2 bg-gray-900 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white min-h-20" />
    <select value={formData.call_status} onChange={(e) => setFormData({ ...formData, call_status: e.target.value })} className="bg-gray-900 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white">
      {statusOptions.filter(status => status !== 'ALL').map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
    </select>
    <Field placeholder="Follow-up date" type="date" value={formData.follow_up_date} onChange={(value: string) => setFormData({ ...formData, follow_up_date: value })} />
    {formError && <p className="md:col-span-2 text-sm font-bold text-red-400">{formError}</p>}
    <div className="md:col-span-2 flex justify-end gap-3">
      <button type="button" onClick={onCancel} className="px-4 py-3 rounded-xl bg-gray-700 text-white text-xs font-black uppercase flex items-center gap-2"><X size={14} /> Cancel</button>
      <button type="submit" className="px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase flex items-center gap-2"><Save size={14} /> Save</button>
    </div>
  </form>
);

const Field = ({ value, onChange, placeholder, type = 'text' }: any) => (
  <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="bg-gray-900 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white" />
);

const InfoBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
    <p className="text-[10px] font-black uppercase text-gray-500 mb-1">{label}</p>
    <p className="text-sm font-semibold text-white whitespace-pre-wrap">{value}</p>
  </div>
);

const LinkBlock = ({ label, url }: { label: string; url?: string | null }) => (
  <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
    <p className="text-[10px] font-black uppercase text-gray-500 mb-1">{label}</p>
    {url ? (
      <a href={url} className="text-sm font-semibold text-blue-300 flex items-center gap-2 truncate">
        <Link size={14} /> {url}
      </a>
    ) : (
      <p className="text-sm font-semibold text-white">No link saved</p>
    )}
  </div>
);

const ActionButton = ({ icon, label, onClick, danger = false, highlight = false }: any) => (
  <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase transition-all ${
    danger ? 'bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white'
    : highlight ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white'
    : 'bg-gray-700 text-white hover:bg-blue-600'
  }`}>
    {icon} {label}
  </button>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    NEW: 'bg-blue-500/10 text-blue-400',
    CONTACTED: 'bg-yellow-500/10 text-yellow-400',
    FOLLOW_UP: 'bg-orange-500/10 text-orange-400',
    QUALIFIED: 'bg-green-500/10 text-green-400',
    NOT_INTERESTED: 'bg-red-500/10 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${styles[status] || 'bg-gray-500/10 text-gray-400'}`}>
      {status?.replace(/_/g, ' ') || 'UNKNOWN'}
    </span>
  );
};

const DetailRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3 bg-gray-900/40 border border-gray-700/30 rounded-xl p-3">
    <div className="text-gray-500 shrink-0 mt-0.5">{icon}</div>
    <div>
      <p className="text-[10px] font-black uppercase text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  </div>
);

// ── AI Research full-page modal ──────────────────────────────────────────────

const ResearchModal = ({ lead, resource, onClose, onRegenerate, onDelete }: any) => {
  const [copied, setCopied] = useState(false);

  const data = (() => {
    try { return JSON.parse(resource.content); }
    catch { return null; }
  })();

  const copyOpener = () => {
    if (!data?.personalized_opener) return;
    navigator.clipboard.writeText(data.personalized_opener);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0f1623] border border-purple-500/30 rounded-3xl shadow-2xl shadow-purple-950/50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 rounded-xl border border-purple-500/30">
              <Brain size={18} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">AI Research Profile</h2>
              <p className="text-xs text-gray-500 font-bold">{lead.full_name} · {lead.property_address || 'No property'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRegenerate} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-purple-700 text-gray-400 hover:text-white rounded-xl text-xs font-black uppercase transition-all">
              <RefreshCw size={13} /> Regenerate
            </button>
            <button onClick={onDelete} className="p-2 text-gray-600 hover:text-red-400 rounded-xl hover:bg-red-400/10 transition-all">
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-600 hover:text-white rounded-xl hover:bg-gray-800 transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

          {!data ? (
            <p className="text-sm text-gray-400 whitespace-pre-wrap">{resource.content}</p>
          ) : (
            <>
              {/* Personalized Opener — hero card */}
              <div className="bg-purple-900/20 border border-purple-500/40 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase text-purple-400 flex items-center gap-1.5">
                    <MessageSquare size={11} /> Personalized Opener — Say This First
                  </p>
                  <button onClick={copyOpener} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${copied ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                    <Copy size={11} /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-base font-black text-white leading-relaxed">"{data.personalized_opener}"</p>
              </div>

              {/* 3-col grid: personality + motivations + approach */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-gray-500 mb-2 flex items-center gap-1.5"><User size={11} /> Personality</p>
                  <p className="text-sm text-white font-semibold leading-relaxed">{data.personality_profile}</p>
                </div>
                <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-gray-500 mb-3 flex items-center gap-1.5"><Target size={11} /> Motivations</p>
                  <div className="flex flex-wrap gap-2">
                    {(data.likely_motivations || []).map((m: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg text-[10px] font-bold">{m}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-blue-400 mb-2 flex items-center gap-1.5"><Zap size={11} /> Strategy</p>
                  <p className="text-sm text-white font-semibold leading-relaxed">{data.approach_recommendation}</p>
                </div>
              </div>

              {/* Pain points + talking points */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-red-400 mb-3 flex items-center gap-1.5"><AlertTriangle size={11} /> Pain Points</p>
                  <ul className="space-y-2">
                    {(data.pain_points || []).map((p: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-300">
                        <span className="text-red-400 shrink-0 mt-0.5">•</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-green-400 mb-3 flex items-center gap-1.5"><Lightbulb size={11} /> Talking Points</p>
                  <ul className="space-y-2">
                    {(data.talking_points || []).map((t: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-300">
                        <span className="text-green-400 font-black shrink-0">{i + 1}.</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rapport hooks + expected objections */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-yellow-400 mb-3 flex items-center gap-1.5"><CheckCircle size={11} /> Rapport Hooks</p>
                  <ul className="space-y-2">
                    {(data.rapport_hooks || []).map((r: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-300">
                        <span className="text-yellow-400 shrink-0 mt-0.5">→</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-orange-400 mb-3 flex items-center gap-1.5"><ShieldAlert size={11} /> Expected Objections</p>
                  <ul className="space-y-2">
                    {(data.expected_objections || []).map((o: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-300">
                        <span className="text-orange-400 shrink-0 mt-0.5">!</span> {o}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Red flags */}
              {(data.red_flags || []).length > 0 && (
                <div className="bg-red-900/10 border border-red-500/30 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-red-400 mb-3 flex items-center gap-1.5"><AlertTriangle size={11} /> Red Flags</p>
                  <ul className="space-y-2">
                    {data.red_flags.map((f: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-red-300">
                        <span className="shrink-0">⚠</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-800 flex justify-end shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-black uppercase">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadsView;
