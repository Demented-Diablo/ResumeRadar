// Immediately-invoked function expression to avoid polluting global scope
(() => {
    // We'll assume we have a pre-built compromise script loaded (compromise.min.js),
    // so we can access `nlp` globally.
  
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
      if (request.action === 'CHECK_JOB') {
        try {
          // 1. Grab text from the job post (page)
          const jobText = document.body.innerText || '';
  
          // 2. Get resume text from local storage
          const resumeText = await getResumeText();
          if (!resumeText) {
            sendResponse({ error: 'No resume text found. Please save resume first.' });
            return;
          }
  
          // 3. Analyze job text with compromise
          const jobDoc = nlp(jobText.toLowerCase());
  
          // We'll do a naive approach: For each skill in our synonyms map,
          // if any synonym is found in jobDoc, we consider that skill "required"
          let jobSkills = new Set();
          for (let [canonical, synonyms] of Object.entries(SYNONYMS)) {
            const found = synonyms.some(syn => jobDoc.has(syn));
            if (found) {
              jobSkills.add(canonical);
            }
          }
  
          // 4. Check how many of those jobSkills appear in the resume
          const resumeDoc = nlp(resumeText.toLowerCase());
          let matchedCount = 0;
          for (let skill of jobSkills) {
            const synonyms = SYNONYMS[skill] || [];
            // If any synonym is found in the resume, we consider that skill matched
            const matched = synonyms.some(syn => resumeDoc.has(syn));
            if (matched) {
              matchedCount++;
            }
          }
  
          // 5. Calculate a match score
          let score = 0;
          if (jobSkills.size > 0) {
            score = Math.round((matchedCount / jobSkills.size) * 100);
          }
  
          sendResponse({ score });
        } catch (err) {
          console.error('Error in content script:', err);
          sendResponse({ error: err.message });
        }
      }
      // Return true if you plan to send an async response
      return true;
    });
  
    // Helper to get resume from storage
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
  