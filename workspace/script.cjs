const fs = require('fs');

let content = fs.readFileSync('pages/GalleryManager.tsx', 'utf8');

// 1. Add imports
content = content.replace(/import \{ useNavigate \} from 'react-router-dom';/, \`import { useNavigate } from 'react-router-dom';\\nimport JSZip from 'jszip';\`);

// 2. Add state for checked files
content = content.replace(/const \\[viewFilter, setViewFilter\\] = useState/, \`const [checkedFiles, setCheckedFiles] = useState<string[]>([]);\\n  const [isZipping, setIsZipping] = useState(false);\\n\\n  const [viewFilter, setViewFilter] = useState\`);

// 3. Add handleCheckAll, handleCheckFile, handleDeleteSelected, handleDownloadZip
const zipFunctions = \`
  const handleCheckAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setCheckedFiles(visibleFiles.map(f => f.id));
    } else {
      setCheckedFiles([]);
    }
  };

  const handleCheckFile = (fileId: string) => {
    setCheckedFiles(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleDeleteSelected = async () => {
    if (checkedFiles.length === 0) return;
    if (!window.confirm(\\\`Are you sure you want to delete \\\${checkedFiles.length} selected files?\\\`)) return;

    try {
      const filesToDelete = files.filter(f => checkedFiles.includes(f.id));
      
      // Delete from storage
      for (const file of filesToDelete) {
         await fetch('/api/delete-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: file.file_path })
         });
      }
      
      // Delete from DB
      await supabase.from('files').delete().in('id', checkedFiles);
      
      setFiles(files.filter(f => !checkedFiles.includes(f.id)));
      setCheckedFiles([]);
    } catch (error) {
      console.error(error);
      alert("Error deleting some files");
    }
  };

  const handleDownloadZip = async () => {
    if (checkedFiles.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const filesToDownload = files.filter(f => checkedFiles.includes(f.id));
      
      for (let i = 0; i < filesToDownload.length; i++) {
        const file = filesToDownload[i];
        try {
          const response = await fetch(rewriteUrlToR2(file.file_url));
          const blob = await response.blob();
          const filename = file.file_path.split('/').pop() || \\\`file_\\\${i}\\\`;
          zip.file(filename, blob);
        } catch (e) {
          console.error("Failed to fetch file for zip", e);
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = \\\`\\\${gallery?.client_name || 'gallery'}_selected.zip\\\`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Zip generation failed", error);
      alert("Failed to create ZIP file");
    } finally {
      setIsZipping(false);
    }
  };
\`;

content = content.replace(/const deleteFile = async/g, zipFunctions + "\\n  const deleteFile = async");

// 5. Add the toolbar
content = content.replace(/\\{visibleFiles\\.length === 0 \\?/g, \`
                {checkedFiles.length > 0 && (
                    <div className="flex items-center gap-3 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-6 sticky top-16 z-20">
                        <span className="font-semibold text-sm">\\\${checkedFiles.length} selected</span>
                        <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                        <button
                            onClick={handleDownloadZip}
                            disabled={isZipping}
                            className="flex items-center gap-1.5 text-sm font-medium hover:text-indigo-300 disabled:opacity-50 transition-colors"
                        >
                            {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                            {isZipping ? 'Zipping...' : 'Download ZIP'}
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isZipping}
                            className="flex items-center gap-1.5 text-sm font-medium text-rose-400 hover:text-rose-300 disabled:opacity-50 transition-colors ml-auto"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                )}
                {visibleFiles.length === 0 ?\`);

// 6. Add checkbox to individual files
const checkboxAddition = \`
                                        <div className="flex items-center mr-1 md:mr-2">
                                            <input 
                                                type="checkbox"
                                                checked={checkedFiles.includes(file.id)}
                                                onChange={() => handleCheckFile(file.id)}
                                                className="w-4 h-4 text-black rounded border-slate-300 focus:ring-black cursor-pointer"
                                            />
                                        </div>
\`;

content = content.replace(/<div className="relative w-14 h-14 md:w-16 md:h-16/g, checkboxAddition + '                                        <div className="relative w-14 h-14 md:w-16 md:h-16');

// Add "Select All" - Note replacing the starting div
content = content.replace(/<div className="divide-y divide-slate-100">/, \`
                    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/40 overflow-hidden">
                        <div className="p-3 bg-zinc-50 border-b border-zinc-200/60 flex items-center gap-3">
                            <input 
                                type="checkbox"
                                checked={visibleFiles.length > 0 && checkedFiles.length === visibleFiles.length}
                                onChange={handleCheckAll}
                                className="w-4 h-4 text-black rounded border-slate-300 focus:ring-black cursor-pointer ml-1.5"
                            />
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Select All</span>
                        </div>
                        <div className="divide-y divide-slate-100">\`);

// Manually replace the end 
content = content.replace(/<\\/div>\\s*\\)\}\\s*<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*\\);\\s*\\};/, \`</div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};\`);

fs.writeFileSync('pages/GalleryManager.tsx', content);

