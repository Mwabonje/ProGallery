const fs = require('fs');
let code = fs.readFileSync('pages/GalleryManager.tsx', 'utf8');

const importTarget = `import { toast } from 'sonner';`;
const importReplacement = `import { toast } from 'sonner';`;

const stateTarget = `  const [editTitle, setEditTitle] = useState('');`;
const stateReplacement = `  const [editTitle, setEditTitle] = useState('');
  const [galleryPassword, setGalleryPassword] = useState('');`;

const fetchTarget = `    setFiles(allFiles);
    
    // Get Activity`;
const fetchReplacement = `    const pwFile = allFiles.find(f => f.file_path === 'GALLERY_PASSWORD');
    if (pwFile) {
        setGalleryPassword(pwFile.caption || '');
    }
    setFiles(allFiles.filter(f => f.file_path !== 'GALLERY_PASSWORD'));
    
    // Get Activity`;

const funcTarget = `  const updateSelectionLimit = async (limit: number) => {`;
const funcReplacement = `  const updatePassword = async (newPassword: string) => {
      if (!gallery) return;
      try {
          if (!newPassword.trim()) {
              await supabase.from('files').delete().match({ gallery_id: gallery.id, file_path: 'GALLERY_PASSWORD' });
              setGalleryPassword('');
              toast.success("Password protection removed");
              return;
          }

          const { data: existing } = await supabase.from('files').select('id').match({ gallery_id: gallery.id, file_path: 'GALLERY_PASSWORD' }).single();

          if (existing) {
              const { error } = await supabase.from('files').update({ caption: newPassword.trim() }).eq('id', existing.id);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('files').insert([{
                  gallery_id: gallery.id,
                  file_url: 'PASSWORD_SETTING',
                  file_path: 'GALLERY_PASSWORD',
                  file_type: 'image',
                  caption: newPassword.trim(),
                  expires_at: new Date(Date.now() + 100*365*24*60*60*1000).toISOString()
              }]);
              if (error) throw error;
          }
          setGalleryPassword(newPassword.trim());
          toast.success("Password updated");
      } catch (error: any) {
          console.error("Error updating password", error);
          toast.error("Failed to update password");
      }
  };

  const updateSelectionLimit = async (limit: number) => {`;

const uiTarget = `                 <div className="mt-4 pt-4 border-t border-zinc-200/40">
                     <h3 className="font-medium text-zinc-900 mb-3">SEO Details</h3>`;
const uiReplacement = `                 <div className="mt-4 pt-4 border-t border-zinc-200/40">
                     <label className="block text-sm text-zinc-700 font-medium mb-1">Password Protection</label>
                     <div className="flex gap-2">
                         <input
                              type="text"
                              placeholder="Leave blank for public access"
                              className="w-full text-sm p-2 border border-zinc-200/60 rounded-md bg-zinc-50/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                             defaultValue={galleryPassword}
                             onBlur={(e) => {
                                 if (e.target.value !== galleryPassword) {
                                     updatePassword(e.target.value);
                                 }
                             }}
                         />
                     </div>
                     <p className="text-xs text-zinc-500 mt-1">If set, clients must enter this password to view the gallery.</p>
                 </div>

                 <div className="mt-4 pt-4 border-t border-zinc-200/40">
                     <h3 className="font-medium text-zinc-900 mb-3">SEO Details</h3>`;

code = code.replace(stateTarget, stateReplacement);
code = code.replace(fetchTarget, fetchReplacement);
code = code.replace(funcTarget, funcReplacement);
code = code.replace(uiTarget, uiReplacement);

fs.writeFileSync('pages/GalleryManager.tsx', code);
console.log("Patched GalleryManager successfully");
