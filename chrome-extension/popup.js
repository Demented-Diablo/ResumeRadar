document.addEventListener('DOMContentLoaded', () => {
  const resumeInput      = document.getElementById('resumeInput');
  const saveBtn          = document.getElementById('saveResume');
  const checkBtn         = document.getElementById('checkButton');
  const saveStatus       = document.getElementById('saveStatus');
  const resultsEl        = document.getElementById('results');
  const skillScoreEl     = document.getElementById('skillScoreVal');
  const expScoreEl       = document.getElementById('expScoreVal');
  const overallScoreEl   = document.getElementById('overallScoreVal');
  const fitPillEl        = document.getElementById('fitPill');
  const fitQualifierEl   = document.getElementById('fitQualifier');
  const explanationEl    = document.getElementById('explanation');
  const confidenceEl     = document.getElementById('confidence');
  const matchedEl        = document.getElementById('matchedSkills');
  const missingReqEl     = document.getElementById('missingRequired');
  const missingPrefEl    = document.getElementById('missingPreferred');
  const preferredSection = document.getElementById('preferredSection');

  chrome.storage.local.get(['resumeText'], (data) => {
    if (data?.resumeText) resumeInput.value = data.resumeText;
  });

  saveBtn.addEventListener('click', () => {
    const text = resumeInput.value.trim();
    if (!text) { showStatus('Please paste resume text first.', 'error'); return; }
    chrome.storage.local.set({ resumeText: text }, () => showStatus('Resume saved!', 'success'));
  });

  checkBtn.addEventListener('click', () => {
    checkBtn.disabled = true;
    checkBtn.textContent = 'Scanning...';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'CHECK_JOB' }, (response) => {
        checkBtn.disabled = false;
        checkBtn.textContent = 'Check This Job Post';

        if (chrome.runtime.lastError) {
          showError('Could not reach the page. Make sure you are on a LinkedIn or Indeed job listing.');
          return;
        }
        if (!response)        { showError('No response from page. Try refreshing and reopening the extension.'); return; }
        if (response.error)   { showError(response.error); return; }

        renderResults(response);
      });
    });
  });

  // ---------------------------------------------------------------------------

  function renderResults(r) {
    resultsEl.classList.remove('hidden');

    // --- Confidence indicator ---
    const CONFIDENCE_CFG = {
      high:   { cls: 'conf-high',   text: '✓ Extracted from job description' },
      medium: { cls: 'conf-medium', text: '⚠ Extracted from job panel — some noise possible' },
      low:    { cls: 'conf-low',    text: '⚠ Full-page scan — results may be less accurate' },
    };
    const cfg = CONFIDENCE_CFG[r.confidence] ?? CONFIDENCE_CFG.low;
    confidenceEl.textContent = cfg.text;
    confidenceEl.className   = 'confidence ' + cfg.cls;

    // --- Three scores ---
    setScore(skillScoreEl,   r.skillScore);
    setScore(expScoreEl,     r.expScore);     // null → N/A
    setScore(overallScoreEl, r.overallScore);

    // --- Fit label ---
    const fitColors = {
      'Strong Fit':   'fit-green',
      'Good Fit':     'fit-green',
      'Moderate Fit': 'fit-blue',
      'Stretch Fit':  'fit-amber',
      'Low Fit':      'fit-red',
    };
    fitPillEl.textContent  = r.fitLabel;
    fitPillEl.className    = 'fit-pill ' + (fitColors[r.fitLabel] || 'fit-blue');
    fitQualifierEl.textContent = r.fitQualifier ? `— ${r.fitQualifier}` : '';

    // --- Explanation ---
    explanationEl.textContent = r.explanation || '';

    // --- Matched skills ---
    matchedEl.innerHTML = r.matched.length
      ? r.matched.map(s => `<span class="badge badge-matched">${s}</span>`).join('')
      : '<span class="no-skills">None detected</span>';

    // --- Missing required ---
    missingReqEl.innerHTML = r.missingRequired.length
      ? r.missingRequired.map(({ skill, partial }) =>
          partial
            ? `<span class="badge badge-partial" title="You have ${partial.via} (${partial.family})">${skill} <span class="badge-via">≈ ${partial.via}</span></span>`
            : `<span class="badge badge-missing">${skill}</span>`
        ).join('')
      : '<span class="no-skills">All required skills covered!</span>';

    // --- Missing preferred ---
    if (r.hasPreferred && r.missingPreferred.length > 0) {
      preferredSection.classList.remove('hidden');
      missingPrefEl.innerHTML = r.missingPreferred.map(({ skill, partial }) =>
        partial
          ? `<span class="badge badge-partial-pref" title="You have ${partial.via} (${partial.family})">${skill} <span class="badge-via">≈ ${partial.via}</span></span>`
          : `<span class="badge badge-preferred">${skill}</span>`
      ).join('');
    } else {
      preferredSection.classList.add('hidden');
    }
  }

  // Set a score number element. null → shows "N/A" in grey, no % suffix.
  function setScore(el, value) {
    if (value === null || value === undefined) {
      el.textContent    = 'N/A';
      el.className      = 'score-num color-na';
      el.dataset.noPct  = 'true';
      return;
    }
    el.textContent   = value;
    el.dataset.noPct = '';
    el.className = 'score-num ' + (
      value >= 70 ? 'color-high' :
      value >= 40 ? 'color-mid'  : 'color-low'
    );
  }

  function showError(msg) {
    resultsEl.classList.remove('hidden');
    skillScoreEl.textContent  = '!';  skillScoreEl.className  = 'score-num color-na';
    expScoreEl.textContent    = '—';  expScoreEl.className    = 'score-num color-na';
    overallScoreEl.textContent = '—'; overallScoreEl.className = 'score-num color-na';
    fitPillEl.textContent      = 'Error'; fitPillEl.className  = 'fit-pill fit-red';
    fitQualifierEl.textContent = '';
    explanationEl.textContent  = '';
    matchedEl.innerHTML        = '';
    missingReqEl.innerHTML     = `<p class="error-msg">${msg}</p>`;
    preferredSection.classList.add('hidden');
  }

  function showStatus(msg, type) {
    saveStatus.textContent = msg;
    saveStatus.className   = 'save-status ' + type;
    setTimeout(() => { saveStatus.textContent = ''; saveStatus.className = 'save-status'; }, 2500);
  }
});
