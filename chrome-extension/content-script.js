// Immediately-invoked function expression to avoid polluting global scope
(() => {
  console.log("✅ Resume Radar content script loaded");

  // A naive synonyms map to detect typical developer skills:
  const SYNONYMS = {
    javascript: ['javascript', 'js', 'es6', 'ecmascript'],
    python: ['python', 'py'],
    java: ['java'],
    react: ['react', 'reactjs', 'react.js'],
    angular: ['angular', 'angularjs'],
    'node.js': ['node', 'nodejs', 'node.js'],
    csharp: ['c#', 'csharp', 'dotnet', '.net'],
    html: ['html', 'html5'],
    css: ['css', 'css3'],
    typescript: ['typescript', 'ts'],
    sql: ['sql', 'mysql', 'postgresql', 'sqlite'],
    // Add more as you like
  };

  // Listen for messages from popup.js
  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    console.log("📩 Got message in content script:", request);

    // ✅ FIX: check for 'action', not 'type'
    if (request.action === 'CHECK_JOB') {
      try {
        // 1. Grab text from the job post (page)
        const jobText = document.body.innerText || '';
        console.log("📄 Job post content length:", jobText.length);

        // 2. Get resume text from local storage
        const resumeText = await getResumeText();
        if (!resumeText) {
          sendResponse({ error: 'No resume text found. Please save resume first.' });
          return;
        }

        // 3. Ensure nlp is loaded
        console.log("🔍 typeof nlp:", typeof nlp);
        const jobDoc = nlp(jobText.toLowerCase());

        // 4. Extract job skills
        let jobSkills = new Set();
        for (let [canonical, synonyms] of Object.entries(SYNONYMS)) {
          const found = synonyms.some(syn => jobDoc.has(syn));
          if (found) {
            jobSkills.add(canonical);
          }
        }

        // 5. Check if resume has those skills
        const resumeDoc = nlp(resumeText.toLowerCase());
        let matchedCount = 0;
        for (let skill of jobSkills) {
          const synonyms = SYNONYMS[skill] || [];
          const matched = synonyms.some(syn => resumeDoc.has(syn));
          if (matched) {
            matchedCount++;
          }
        }

        // 6. Score calculation
        let score = 0;
        if (jobSkills.size > 0) {
          score = Math.round((matchedCount / jobSkills.size) * 100);
        }

        console.log("✅ Resume match score:", score);
        sendResponse({ score });
      } catch (err) {
        console.error('❌ Error in content script:', err);
        sendResponse({ error: err.message });
      }
    }

    return true; // to allow async sendResponse
  });

  // Helper to get resume from Chrome storage
  function getResumeText() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['resumeText'], (data) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(data.resumeText || '');
      });
    });
  }
})();
