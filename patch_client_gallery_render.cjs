const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

const target = `  return (
    <div
      className={\`min-h-screen bg-white text-slate-900 select-none \${isSelectionMode ? "pb-24" : ""}\`}`;
const replacement = `  if (!isAuthenticated && galleryPassword) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
              <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Lock className="w-8 h-8 text-slate-400" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-900 mb-3">
                      Protected Gallery
                  </h1>
                  <p className="text-slate-600 mb-8 leading-relaxed">Please enter the password to view this gallery.</p>
                  
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      if (passwordInput === galleryPassword) {
                          setIsAuthenticated(true);
                          sessionStorage.setItem(\`auth_\${gallery?.id}\`, passwordInput);
                      } else {
                          setPasswordError(true);
                      }
                  }} className="space-y-4">
                      <div>
                          <input 
                              type="password"
                              placeholder="Enter password"
                              value={passwordInput}
                              onChange={(e) => {
                                  setPasswordInput(e.target.value);
                                  setPasswordError(false);
                              }}
                              className={\`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 \${passwordError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}\`}
                          />
                          {passwordError && (
                              <p className="text-red-500 text-sm mt-2 text-left">Incorrect password. Please try again.</p>
                          )}
                      </div>
                      <button 
                          type="submit"
                          className="w-full bg-slate-900 text-white p-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                      >
                          Unlock Gallery
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div
      className={\`min-h-screen bg-white text-slate-900 select-none \${isSelectionMode ? "pb-24" : ""}\`}`;

code = code.replace(target, replacement);
fs.writeFileSync('pages/ClientGallery.tsx', code);
console.log("Patched render");
