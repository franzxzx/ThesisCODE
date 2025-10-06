// src/components/ConsolidateReportButton.tsx
import React from 'react';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Document, Packer, Paragraph, HeadingLevel, Table, TableCell, TableRow, WidthType, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { queryUpdates } from '../lib/updateLog';
import { useTheme } from '../lib/ThemeContext';
import roadData from '../data/LegRoadData.json';

type RoadStatus = 'passable' | 'restricted' | 'blocked';

type UpdateRow = {
  id: string;
  segment_id: string;
  road_name: string;
  status: RoadStatus;
  updated_at: string; // ISO
  updated_by_email: string;
  coordinates?: [number, number][];
  previous_status?: string;
};

export const ConsolidateReportButton: React.FC = () => {
  const { theme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // HTML expects "YYYY-MM-DDTHH:mm"
  const [start, setStart] = React.useState<string>('');
  const [end, setEnd] = React.useState<string>('');
  const [includeAllRoads, setIncludeAllRoads] = React.useState(true);

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

  const generateReport = async () => {
    if (!start || !end) {
      setError('Please select a start and end time.');
      return null;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError('Invalid date format.');
      return null;
    }
    if (endDate <= startDate) {
      setError('End time must be after start time.');
      return null;
    }
    if (selectedStatuses.length === 0) {
      setError('Please select at least one status.');
      return null;
    }

    try {
      // Get road updates with coordinates and previous status
      const timeframe = {
        start: startDate,
        end: endDate
      };
      
      // Get all updates within timeframe, including all roads if selected
      let rows = await queryUpdates(timeframe, selectedStatuses, includeAllRoads) as UpdateRow[];
      
      if (!rows || rows.length === 0) {
        setError('No data found for the selected criteria.');
        return null;
      }

      // Add coordinates from road data if missing
      rows = rows.map(row => {
        if (!row.coordinates) {
          // Find coordinates in road data
          const feature = (roadData as any).features.find(
            (f: any) => f.properties?.['@id']?.split('/')[1] === row.segment_id
          );
          if (feature?.geometry?.coordinates) {
            return {
              ...row,
              coordinates: feature.geometry.coordinates
            };
          }
        }
        return row;
      });

      return {
        rows,
        startDate,
        endDate
      };
    } catch (err: any) {
      console.error('Error generating report data:', err);
      setError(err?.message || 'Failed to generate report data.');
      return null;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const reportResult = await generateReport();
      if (!reportResult) {
        setIsSubmitting(false);
        return;
      }
      
      const { rows, startDate, endDate } = reportResult;

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
        new Paragraph({ children: [ new TextRun({ text: 'Include All Roads: ', bold: true }), new TextRun(includeAllRoads ? 'Yes' : 'No') ]}),
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
            children: ['Date/Time', 'Segment ID', 'Road Name', 'Status'].map(h =>
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
          className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg transition ${
            theme === 'dark' 
              ? 'bg-blue-700 hover:bg-blue-800 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          aria-label="Consolidate Report"
        >
          <FileText className="w-5 h-5" />
          <span className="font-semibold">Consolidated Report</span>
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className={`fixed inset-0 z-[2100] flex items-center justify-center p-4 ${
          theme === 'dark' ? 'bg-black/60' : 'bg-black/40'
        }`} onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) setOpen(false); }}>
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`px-6 py-4 ${
              theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200'
            }`}>
              <h2 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Consolidated Report</h2>
              <p className={`text-xs mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>Select timeframe and statuses</p>
            </div>

            <form onSubmit={onSubmit} className="px-6 py-5 space-y-5">
              {error && (
                <div className={`p-3 border rounded-lg text-sm ${
                  theme === 'dark' 
                    ? 'bg-red-900/30 border-red-700 text-red-300' 
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Start (MM/DD/YY &amp; time)</label>
                  <input
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>End (MM/DD/YY &amp; time)</label>
                  <input
                    type="datetime-local"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={statuses.passable} 
                      onChange={() => toggleStatus('passable')}
                      className={`rounded ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500' 
                          : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'
                      }`}
                    />
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Passable</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={statuses.restricted} 
                      onChange={() => toggleStatus('restricted')}
                      className={`rounded ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500' 
                          : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'
                      }`}
                    />
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Restricted</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={statuses.blocked} 
                      onChange={() => toggleStatus('blocked')}
                      className={`rounded ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500' 
                          : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'
                      }`}
                    />
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Blocked</span>
                  </label>
                </div>
                
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={includeAllRoads} 
                    onChange={() => setIncludeAllRoads(!includeAllRoads)}
                    className={`rounded ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500' 
                        : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'
                    }`}
                  />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Include all existing roads (even without updates in timeframe)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark' 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    theme === 'dark' 
                      ? 'bg-blue-700 text-white hover:bg-blue-800' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
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
