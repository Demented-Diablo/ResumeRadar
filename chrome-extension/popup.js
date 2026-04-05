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
    setScore(skillScoreEl,   r.skillScore);   // null → N/A (extraction too noisy)
    setScore(overallScoreEl, r.overallScore); // null → N/A

    // Exp score display.
    // Two cases where "100%" would be technically correct but misleading:
    //   (a) jobYears === 0: any candidate satisfies a zero-year bar, so showing
    //       "100%" implies a scored match rather than "no bar set".
    //   (b) Entry/intern stage + expScore null: no year data at all.
    // In both cases, show "✓" (entry level, no experience gate) instead.
    const jobStage = r.careerStage?.jobStage;
    const isEntryLevelBar = r.jobYears === 0 || (jobStage === 'intern' || jobStage === 'entry');
    if (isEntryLevelBar && (r.expScore === null || r.expScore === 100)) {
      expScoreEl.textContent   = '✓';
      expScoreEl.className     = 'score-num color-high';
      expScoreEl.dataset.noPct = 'true';
    } else {
      setScore(expScoreEl, r.expScore);
    }

    // --- Fit label ---
    const fitColors = {
      'Strong Fit':      'fit-green',
      'Good Fit':        'fit-green',
      'Moderate Fit':    'fit-blue',
      'Stretch Fit':     'fit-amber',
      'Low Fit':         'fit-red',
      'Domain Mismatch': 'fit-red',
      'Low Confidence':  'fit-amber',
    };
    fitPillEl.textContent  = r.fitLabel;
    fitPillEl.className    = 'fit-pill ' + (fitColors[r.fitLabel] || 'fit-blue');

    // Confidence-aware qualifier: low confidence gets a soft note when no other
    // qualifier is already present (e.g. "strong technical overlap, below experience")
    const baseQualifier = r.fitQualifier ? `— ${r.fitQualifier}` : '';
    const confidenceNote = r.confidence === 'low' && !r.fitQualifier
      ? '— scores based on full-page scan'
      : r.confidence === 'medium' && !r.fitQualifier
      ? '— some page noise possible'
      : '';
    fitQualifierEl.textContent = baseQualifier || confidenceNote;

    // --- Explanation ---
    explanationEl.textContent = r.explanation || '';

    // --- Matched skills (exact + concept inferences) ---
    const conceptMatchedBadges = (r.conceptMatched || [])
      .map(({ concept, via }) =>
        `<span class="badge badge-concept" title="No exact keyword found — inferred from your ${via} experience">${concept} <span class="badge-via">≈ ${via}</span></span>`
      ).join('');

    const hasAnyMatched = r.matched.length > 0 || conceptMatchedBadges.length > 0;
    matchedEl.innerHTML = hasAnyMatched
      ? r.matched.map(s => `<span class="badge badge-matched">${s}</span>`).join('') + conceptMatchedBadges
      : '<span class="no-skills">None detected</span>';

    // --- Missing required (exact gaps + concept gaps) ---
    const conceptGapBadges = (r.conceptGaps || [])
      .filter(c => c.inReq)
      .map(({ concept }) =>
        `<span class="badge badge-concept-gap" title="No related skills found in your resume for this requirement">${concept}</span>`
      ).join('');

    const hasAnyMissing = r.missingRequired.length > 0 || conceptGapBadges.length > 0;

    // "All required skills covered!" is only meaningful when we actually found
    // and assessed required skills. When skillScore is null (no required skills
    // detected), show a neutral message so we don't imply a successful match.
    const noMissingMessage = r.skillScore === null
      ? '<span class="no-skills">No required skills detected in this posting</span>'
      : '<span class="no-skills">All required skills covered!</span>';

    missingReqEl.innerHTML = hasAnyMissing
      ? r.missingRequired.map(({ skill, partial }) =>
          partial
            ? `<span class="badge badge-partial" title="You have ${partial.via} (${partial.family})">${skill} <span class="badge-via">≈ ${partial.via}</span></span>`
            : `<span class="badge badge-missing">${skill}</span>`
        ).join('') + conceptGapBadges
      : noMissingMessage;

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
