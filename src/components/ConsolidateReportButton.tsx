// src/components/ConsolidateReportButton.tsx
import React from 'react';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Document, Packer, Paragraph, HeadingLevel, Table, TableCell, TableRow, WidthType, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { queryUpdates } from '../lib/updateLog';

type RoadStatus = 'passable' | 'restricted' | 'blocked';

type UpdateRow = {
  id: string;
  segment_id: string;
  road_name: string;
  status: RoadStatus;
  updated_at: string; // ISO
  updated_by_email: string;
};

export const ConsolidateReportButton: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // HTML expects "YYYY-MM-DDTHH:mm"
  const [start, setStart] = React.useState<string>('');
  const [end, setEnd] = React.useState<string>('');

  const [statuses, setStatuses] = React.useState<Record<RoadStatus, boolean>>({
    passable: true,
    restricted: true,
    blocked: true,
  });

  const selectedStatuses = React.useMemo(
    () => (Object.entries(statuses).filter(([, v]) => v).map(([k]) => k)) as RoadStatus[],
    [statuses]
  );

  const toggleStatus = (key: RoadStatus) => {
    setStatuses(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!start || !end) {
      setError('Please select a start and end time.');
      return;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError('Invalid date format.');
      return;
    }
    if (endDate <= startDate) {
      setError('End time must be after start time.');
      return;
    }
    if (selectedStatuses.length === 0) {
      setError('Please select at least one status.');
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ Fix: Call queryUpdates with correct parameters and filter by multiple statuses
      const timeframe = {
        start: startDate,
        end: endDate
      };
      
      // Get all updates within timeframe, then filter by selected statuses
      let rows = queryUpdates(timeframe) as UpdateRow[];
      
      // Filter by selected statuses
      rows = rows.filter(row => selectedStatuses.includes(row.status));

      // Summary counts
      const counts = {
        passable: rows.filter(r => r.status === 'passable').length,
        restricted: rows.filter(r => r.status === 'restricted').length,
        blocked: rows.filter(r => r.status === 'blocked').length,
      };

      // Build DOCX
      const title = `Consolidated Road Condition Report`;
      const timeframeStr = `${format(startDate, 'MM/dd/yy HH:mm')} – ${format(endDate, 'MM/dd/yy HH:mm')}`;
      const selected = selectedStatuses.join(', ');

      const header = new Paragraph({ text: title, heading: HeadingLevel.TITLE });

      const meta = [
        new Paragraph({ children: [ new TextRun({ text: 'Timeframe: ', bold: true }), new TextRun(timeframeStr) ]}),
        new Paragraph({ children: [ new TextRun({ text: 'Statuses: ', bold: true }), new TextRun(selected) ]}),
        new Paragraph({ children: [ new TextRun({ text: 'Generated: ', bold: true }), new TextRun(format(new Date(), 'MM/dd/yy HH:mm')) ]}),
        new Paragraph({ text: '' }),
      ];

      const summaryHeading = new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2 });
      const summaryLines = [
        new Paragraph(`Total updates: ${rows.length}`),
        new Paragraph(`Passable: ${counts.passable}`),
        new Paragraph(`Restricted: ${counts.restricted}`),
        new Paragraph(`Blocked: ${counts.blocked}`),
        new Paragraph({ text: '' }),
      ];

      const tableHeading = new Paragraph({ text: 'Detailed Updates', heading: HeadingLevel.HEADING_2 });

      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          // Header row
          new TableRow({
            children: ['Date/Time', 'Segment ID', 'Road Name', 'Status', 'Updated By'].map(h =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
              })
            ),
          }),
          // Data rows
          ...rows.map((r) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(format(new Date(r.updated_at), 'MM/dd/yy HH:mm'))] }),
                new TableCell({ children: [new Paragraph(r.segment_id || '')] }),
                new TableCell({ children: [new Paragraph(r.road_name || '')] }),
                new TableCell({ children: [new Paragraph(r.status)] }),
                new TableCell({ children: [new Paragraph(r.updated_by_email || '')] }),
              ],
            })
          ),
        ],
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: [header, ...meta, summaryHeading, ...summaryLines, tableHeading, table],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `Consolidated_Report_${format(startDate, 'yyyyMMdd_HHmm')}_${format(endDate, 'yyyyMMdd_HHmm')}.docx`;
      saveAs(blob, fileName); // auto-download

      setOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button (bottom-right). Leaves Leaflet scale at bottom-left unobstructed. */}
      <div className="fixed right-6 bottom-26 md:left-8 md:bottom-8 z-[2000]">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl shadow-lg transition"
          aria-label="Consolidate Report"
        >
          <FileText className="w-5 h-5" />
          <span className="font-semibold">Consolidate Report</span>
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) setOpen(false); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Consolidate Report</h2>
              <p className="text-xs text-gray-500 mt-1">Select timeframe and statuses</p>
            </div>

            <form onSubmit={onSubmit} className="px-6 py-5 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start (MM/DD/YY &amp; time)</label>
                  <input
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End (MM/DD/YY &amp; time)</label>
                  <input
                    type="datetime-local"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={statuses.passable} onChange={() => toggleStatus('passable')} />
                  <span className="text-gray-700">Passable</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={statuses.restricted} onChange={() => toggleStatus('restricted')} />
                  <span className="text-gray-700">Restricted</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={statuses.blocked} onChange={() => toggleStatus('blocked')} />
                  <span className="text-gray-700">Blocked</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating…' : 'Generate & Download'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
