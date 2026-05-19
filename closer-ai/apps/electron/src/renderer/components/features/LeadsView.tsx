import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../../store/useAppStore';
import { API_BASE } from '../../config/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Calendar, Download, ExternalLink, Globe, Link, Edit3, FileText, Phone, Plus, Save, Search, StickyNote, Trash2, TrendingUp, Upload, X } from 'lucide-react';

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

  return (
    <div className="h-full overflow-hidden grid grid-cols-[minmax(420px,1fr)_420px]">
      <div className="p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black tracking-tighter text-white">Prospects</h2>
          <div className="flex gap-3">
            <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
            <button onClick={() => importInputRef.current?.click()} className="bg-gray-700 text-white px-4 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2">
              <Upload size={16} /> Import
            </button>
            <button onClick={exportCsv} className="bg-gray-700 text-white px-4 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2">
              <Download size={16} /> Export
            </button>
            <button onClick={openCreateForm} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2">
              <Plus size={16} /> New Prospect
            </button>
          </div>
        </div>

        {loadError && <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm font-bold">{loadError}</div>}
        {successMessage && <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-300 rounded-xl p-4 text-sm font-bold">{successMessage}</div>}

        {formMode !== 'closed' && (
          <LeadFormPanel
            mode={formMode}
            formData={formData}
            formError={formError}
            setFormData={setFormData}
            onSave={handleSaveLead}
            onCancel={() => setFormMode('closed')}
          />
        )}

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
            <input type="text" placeholder="Search name, phone, or property" className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-800 border border-gray-700/50 rounded-xl px-3 text-sm text-white font-bold">
            {statusOptions.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
          </select>
        </div>

        <div className="grid gap-4">
          {filteredLeads.map((lead) => (
            <button key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className={`text-left bg-gray-800/40 border rounded-2xl p-5 flex items-center justify-between hover:bg-gray-800 transition-all ${selectedLeadId === lead.id ? 'border-blue-500' : 'border-gray-700/50'}`}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 font-black text-xl border border-blue-500/20 shrink-0">{lead.full_name.charAt(0)}</div>
                <div className="min-w-0">
                  <h3 className="font-black text-white truncate">{lead.full_name}</h3>
                <p className="text-sm text-gray-500 font-bold truncate">{lead.phone_number} {lead.property_address ? `- ${lead.property_address}` : ''}</p>
                  {lead.follow_up_date && <p className="text-[10px] text-blue-400 font-black uppercase mt-1">Follow up {new Date(lead.follow_up_date).toLocaleDateString()}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-2 text-green-500 font-black text-xs uppercase justify-end"><TrendingUp size={12} /> {Math.round(Number(lead.deal_score || 0))}%</div>
                <p className="text-[10px] text-gray-500 font-black uppercase mt-1">{lead.call_status?.replace('_', ' ')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <aside className="border-l border-gray-700/50 bg-gray-800/20 p-6 overflow-y-auto">
        {selectedLead ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-white">{selectedLead.full_name}</h3>
                <p className="text-sm font-bold text-gray-500">{selectedLead.phone_number}</p>
              </div>
              <button onClick={() => handleStartCall(selectedLead)} className="p-4 bg-green-600 text-white rounded-xl"><Phone size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ActionButton icon={<Edit3 size={15} />} label="Edit" onClick={openEditForm} />
              <ActionButton icon={<FileText size={15} />} label={isGeneratingScript ? 'Working' : 'Call Script'} onClick={handleGenerateScript} />
              <ActionButton icon={<Trash2 size={15} />} label="Delete" onClick={handleDeleteLead} danger />
            </div>

            <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase text-gray-500 mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <ActionButton icon={<Phone size={15} />} label="Contacted" onClick={() => handleQuickStatus('CONTACTED')} />
                <ActionButton icon={<TrendingUp size={15} />} label="Qualified" onClick={() => handleQuickStatus('QUALIFIED')} />
                <ActionButton icon={<Calendar size={15} />} label="Tomorrow" onClick={scheduleTomorrow} />
                <ActionButton icon={<X size={15} />} label="Not Interested" onClick={() => handleQuickStatus('NOT_INTERESTED')} danger />
              </div>
            </div>

            <InfoBlock label="Property" value={selectedLead.property_address || 'No address yet'} />
            <LinkBlock label="LinkedIn / Profile" url={selectedLead.linkedin_url} />
            <LinkBlock label="Website" url={selectedLead.website_url} />
            <InfoBlock label="Motivation" value={selectedLead.seller_motivation || selectedLead.motivation_tags || 'No motivation captured'} />
            <InfoBlock label="Notes" value={selectedLead.notes || 'No profile notes'} />
            <InfoBlock label="Follow Up" value={selectedLead.follow_up_date ? new Date(selectedLead.follow_up_date).toLocaleDateString() : 'No follow-up scheduled'} />

            {script && (
              <div className="bg-gray-900/70 border border-blue-500/30 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-blue-400">AI Call Prep</h4>
                {['opening', 'rapport', 'pitch', 'pain_points', 'objections', 'closing', 'follow_up', 'personalization_notes', 'research_used'].map(key => (
                  <div key={key}>
                    <p className="text-[10px] font-black uppercase text-gray-500">{key.replace('_', ' ')}</p>
                    <p className="text-sm text-white font-semibold">{String(script[key] || '')}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
              <h4 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-2"><StickyNote size={14} /> Notes</h4>
              <div className="space-y-3 mb-4">
                {(selectedLead.noteHistory || []).map((note: any) => (
                  <div key={note.id} className="text-sm text-gray-300 border-l-2 border-blue-500/40 pl-3">{note.content}</div>
                ))}
              </div>
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add call note..." className="w-full bg-gray-800 border border-gray-700/50 rounded-xl p-3 text-sm text-white min-h-24" />
              <button onClick={handleAddNote} className="mt-3 w-full bg-gray-700 hover:bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase">Add Note</button>
            </div>

            <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
              <h4 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-2"><Globe size={14} /> AI Research Context</h4>
              <div className="space-y-3 mb-4">
                {(selectedLead.resources || []).map((resource: any) => (
                  <div key={resource.id} className="border border-gray-700/50 rounded-xl p-3 bg-gray-800/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-blue-400">{resource.type}</p>
                        <p className="text-sm font-black text-white truncate">{resource.title}</p>
                      </div>
                      <button onClick={() => handleDeleteResource(resource.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                    {resource.url && <a href={resource.url} className="text-xs text-blue-300 flex items-center gap-1 mt-2 truncate"><ExternalLink size={12} /> {resource.url}</a>}
                    <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{resource.content}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select value={resourceForm.type} onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })} className="bg-gray-800 border border-gray-700/50 rounded-xl px-3 py-2 text-sm text-white">
                  {['NOTE', 'LINKEDIN', 'WEBSITE', 'PROFILE', 'OTHER'].map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <input value={resourceForm.title} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} placeholder="Title" className="bg-gray-800 border border-gray-700/50 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <input value={resourceForm.url} onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })} placeholder="Profile or website URL" className="w-full bg-gray-800 border border-gray-700/50 rounded-xl px-3 py-2 text-sm text-white mb-2" />
              <textarea value={resourceForm.content} onChange={(e) => setResourceForm({ ...resourceForm, content: e.target.value })} placeholder="Paste custom notes, profile details, website summary, pain points, or deal context for the AI..." className="w-full bg-gray-800 border border-gray-700/50 rounded-xl p-3 text-sm text-white min-h-28" />
              <button onClick={handleAddResource} className="mt-3 w-full bg-gray-700 hover:bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase">Save AI Context</button>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-2"><Calendar size={14} /> Recent Calls</h4>
              <div className="space-y-3">
                {(selectedLead.sessions || []).map((session: any) => (
                  <div key={session.id} className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-3">
                    <p className="text-xs font-black text-white">{session.outcome || 'Session in progress'}</p>
                    <p className="text-[10px] text-gray-500">{new Date(session.startTime).toLocaleString()}</p>
                    <p className="text-[10px] text-yellow-400 mt-1">{session.objections?.length || 0} objections</p>
                  </div>
                ))}
                {!selectedLead.sessions?.length && <p className="text-sm text-gray-500">No calls yet.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 font-bold">Select a prospect</div>
        )}
      </aside>
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

const ActionButton = ({ icon, label, onClick, danger = false }: any) => (
  <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase ${danger ? 'bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white' : 'bg-gray-700 text-white hover:bg-blue-600'}`}>
    {icon} {label}
  </button>
);

export default LeadsView;
