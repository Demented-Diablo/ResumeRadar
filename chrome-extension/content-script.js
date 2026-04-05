(() => {
  console.log("✅ Resume Radar content script loaded");

  // ---------------------------------------------------------------------------
  // Skill synonym map — canonical name -> terms to search for in text
  // ---------------------------------------------------------------------------
  const SYNONYMS = {
    javascript:     ['javascript', 'js', 'es6', 'es2015', 'ecmascript'],
    typescript:     ['typescript'],
    python:         ['python', 'python3'],
    java:           ['java'],
    csharp:         ['c#', 'csharp', '.net', '.net core', 'asp.net', 'dotnet'],
    cplusplus:      ['c++', 'cpp', 'c/c++'],
    go:             ['golang', 'go language', 'go programming'],
    rust:           ['rust', 'rustlang'],
    ruby:           ['ruby on rails', 'rails', 'ruby'],
    swift:          ['swift'],
    kotlin:         ['kotlin'],
    php:            ['php', 'laravel', 'symfony'],
    scala:          ['scala'],
    r:              ['r programming', 'r language', 'rstudio'],
    matlab:         ['matlab'],
    bash:           ['bash', 'shell scripting', 'shell script', 'powershell'],
    react:          ['react', 'reactjs', 'react.js', 'react native'],
    angular:        ['angular', 'angularjs'],
    vue:            ['vue', 'vuejs', 'vue.js', 'nuxt', 'nuxtjs'],
    nextjs:         ['next.js', 'nextjs', 'next js'],
    svelte:         ['svelte', 'sveltekit'],
    html:           ['html', 'html5'],
    css:            ['css', 'css3'],
    sass:           ['sass', 'scss'],
    tailwind:       ['tailwind', 'tailwindcss'],
    webpack:        ['webpack', 'vite', 'rollup', 'parcel'],
    nodejs:         ['node', 'nodejs', 'node.js'],
    express:        ['express', 'expressjs', 'express.js'],
    django:         ['django'],
    flask:          ['flask'],
    fastapi:        ['fastapi', 'fast api'],
    spring:         ['spring', 'spring boot', 'springboot'],
    graphql:        ['graphql', 'apollo'],
    sql:            ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'mssql', 'sql server', 't-sql', 'pl/sql'],
    mongodb:        ['mongodb', 'mongo', 'mongoose'],
    redis:          ['redis'],
    dynamodb:       ['dynamodb'],
    cassandra:      ['cassandra'],
    elasticsearch:  ['elasticsearch', 'elastic search', 'opensearch'],
    firebase:       ['firebase', 'firestore'],
    aws:            ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'cloudfront', 'ecs', 'eks', 'rds'],
    azure:          ['azure', 'microsoft azure', 'azure devops'],
    gcp:            ['gcp', 'google cloud', 'google cloud platform', 'bigquery', 'gke'],
    docker:         ['docker', 'dockerfile', 'containerization', 'containers'],
    kubernetes:     ['kubernetes', 'k8s', 'kubectl', 'helm'],
    terraform:      ['terraform', 'infrastructure as code', 'iac'],
    cicd:           ['ci/cd', 'continuous integration', 'continuous deployment', 'github actions',
                     'jenkins', 'gitlab ci', 'circleci', 'travis'],
    git:            ['git', 'github', 'gitlab', 'bitbucket', 'version control'],
    linux:          ['linux', 'unix'],
    machinelearning:['machine learning', 'ml model', 'scikit-learn', 'sklearn'],
    deeplearning:   ['deep learning', 'neural network', 'neural networks', 'llm', 'large language model'],
    ai:             ['artificial intelligence', 'generative ai', 'gen ai'],
    tensorflow:     ['tensorflow'],
    pytorch:        ['pytorch', 'torch'],
    pandas:         ['pandas'],
    numpy:          ['numpy'],
    spark:          ['apache spark', 'pyspark', 'spark'],
    tableau:        ['tableau', 'power bi', 'looker', 'data visualization'],
    rest:           ['rest', 'restful', 'rest api', 'rest apis'],
    grpc:           ['grpc', 'protobuf', 'protocol buffers'],
    websockets:     ['websocket', 'websockets', 'socket.io'],
    testing:        ['unit test', 'integration test', 'tdd', 'test-driven', 'jest', 'pytest',
                     'junit', 'selenium', 'cypress', 'mocha', 'vitest'],
    security:       ['oauth', 'oauth2', 'jwt', 'saml', 'sso', 'authentication', 'authorization',
                     'ssl', 'tls', 'cybersecurity'],
    agile:          ['agile', 'scrum', 'kanban', 'sprint planning', 'jira'],
    microservices:  ['microservices', 'microservice', 'service mesh', 'event-driven'],
    kafka:          ['kafka', 'apache kafka', 'event streaming', 'message streaming', 'message broker'],
    debezium:       ['debezium', 'change data capture', 'cdc'],
    rabbitmq:       ['rabbitmq', 'rabbit mq', 'amqp', 'message queue'],
  };

  // ---------------------------------------------------------------------------
  // Skill family clusters — for detecting transferable/partial experience.
  // Keep families tight: only group skills where one genuinely prepares you
  // for the other (same paradigm, not just same broad domain).
  // ---------------------------------------------------------------------------
  const SKILL_FAMILIES = {
    nosql:     { name: 'NoSQL database',       skills: ['mongodb', 'dynamodb', 'cassandra', 'firebase'] },
    cache:     { name: 'In-memory store',      skills: ['redis', 'elasticsearch'] },
    cloud:     { name: 'Cloud platform',       skills: ['aws', 'azure', 'gcp'] },
    frontend:  { name: 'Frontend framework',   skills: ['react', 'angular', 'vue', 'svelte', 'nextjs'] },
    python_fw: { name: 'Python web framework', skills: ['django', 'flask', 'fastapi'] },
    jvm:       { name: 'JVM language',         skills: ['java', 'kotlin', 'scala'] },
    container: { name: 'Container ecosystem',  skills: ['docker', 'kubernetes'] },
    ml_fw:     { name: 'ML framework',         skills: ['tensorflow', 'pytorch', 'machinelearning', 'deeplearning'] },
    js_ts:     { name: 'JavaScript/TypeScript', skills: ['javascript', 'typescript'] },
  };

  // ---------------------------------------------------------------------------
  // Section header patterns for splitting required vs. preferred
  // ---------------------------------------------------------------------------
  const REQUIRED_HEADERS = [
    /\brequirements?\b/i, /\brequired\b/i, /\bmust.?have\b/i,
    /\bminimum qualifications?\b/i, /\bbasic qualifications?\b/i,
    /\byou('ll| will) need\b/i, /\bwhat you('ll| will) bring\b/i,
    /\bwhat we('re| are) looking for\b/i, /\bqualifications?\b/i,
    /\byour background\b/i,
  ];

  const PREFERRED_HEADERS = [
    /\bnice.to.have\b/i, /\bpreferred\b/i, /\bbonus\b/i,
    /\ba plus\b/i, /\bideally\b/i, /\badditional qualifications?\b/i,
    /\bgood to have\b/i, /\bnot required\b/i, /\bwould be great\b/i,
  ];

  const PREFERRED_INLINE = [
    'nice to have', 'preferred', 'a plus', 'bonus points', 'ideally',
    'familiarity with', 'exposure to', 'would be great', 'not required',
    'good to have', 'advantageous', 'is a plus', 'are a plus',
  ];

  // Noise section headers — company info, benefits, legal boilerplate.
  // When encountered, text collection pauses until a relevant header resumes it.
  const NOISE_SECTION_HEADERS = [
    /^about\s+us$/i,
    /^about\s+(?:the\s+)?company$/i,
    /^who\s+we\s+are$/i,
    /^our\s+(?:company|mission|story|culture|values|team|office|products?)$/i,
    /^(?:employee\s+)?benefits?\s*(?:&|and\s+perks?)?$/i,
    /^perks?\s*(?:&|and\s+benefits?)?$/i,
    /^compensation(?:\s+and\s+benefits?)?$/i,
    /^(?:total\s+)?rewards?$/i,
    /^equal\s+(?:opportunity|employment)/i,
    /^diversity(?:\s+and\s+inclusion)?$/i,
    /^privacy\s+(?:policy|notice|statement)$/i,
    /^(?:apply\s+now|how\s+to\s+apply)$/i,
    // "About MongoDB", "About Stripe" — "About" followed by a proper noun (not "the role/job")
    /^about\s+(?!the\s+(?:role|job|position|opportunity))[A-Z]/,
  ];

  // Relevant section headers — when seen after a noise section, resume collecting.
  const RELEVANT_SECTION_HEADERS = [
    /^about\s+the\s+(?:role|job|position|opportunity)$/i,
    /^(?:the\s+)?(?:role|position|opportunity)$/i,
    /^(?:key\s+)?responsibilities$/i,
    /^what\s+you(?:'ll|'re|\s+will|\s+are)\s+(?:do|build|work|create|develop)/i,
    /^(?:required\s+|basic\s+|minimum\s+)?qualifications?(?:\s+required)?$/i,
    /^requirements?$/i,
    /^must.?have$/i,
    /^nice.?to.?have$/i,
    /^preferred\s+qualifications?$/i,
    /^technical\s+(?:skills?|requirements?)$/i,
    /^skills?\s+(?:and\s+)?(?:experience|qualifications?)$/i,
    /^what\s+(?:you(?:'ll|'re|\s+will)\s+)?bring$/i,
    /^what\s+we(?:'re|\s+are)\s+looking\s+for$/i,
  ];

  // Skill category map — used for generating human-readable explanations
  const SKILL_CATS = {
    backend:  ['java', 'python', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'spring',
               'go', 'rust', 'ruby', 'csharp', 'php', 'scala', 'kotlin'],
    frontend: ['javascript', 'typescript', 'react', 'angular', 'vue', 'nextjs', 'svelte',
               'html', 'css', 'sass', 'tailwind', 'webpack'],
    data:     ['sql', 'mongodb', 'redis', 'dynamodb', 'cassandra', 'elasticsearch', 'firebase',
               'pandas', 'numpy', 'spark', 'tableau'],
    cloud:    ['aws', 'azure', 'gcp'],
    devops:   ['docker', 'kubernetes', 'terraform', 'cicd', 'linux', 'git', 'kafka', 'debezium', 'rabbitmq'],
    ml:       ['machinelearning', 'deeplearning', 'tensorflow', 'pytorch', 'ai'],
    api:      ['rest', 'graphql', 'grpc', 'websockets'],
  };

  const CAT_LABELS = {
    backend:  'backend stack',
    frontend: 'frontend stack',
    data:     'data and database layer',
    cloud:    'cloud platform',
    devops:   'deployment and infrastructure',
    ml:       'ML and AI tooling',
    api:      'API design',
  };

  // ---------------------------------------------------------------------------
  // Word-boundary-aware match — handles C#, .NET, C++, etc.
  // ---------------------------------------------------------------------------
  function textHasTerm(haystack, needle) {
    const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?:^|[\\s,;/()\\[\\]|+])' + esc + '(?=[\\s,;/()\\[\\]|+]|$)', 'i').test(haystack);
  }

  // ---------------------------------------------------------------------------
  // Split job text into required vs. preferred sections
  // ---------------------------------------------------------------------------
  function splitJobSections(text) {
    const lines = text.split('\n');
    let currentSection = 'required';
    const required = [];
    const preferred = [];
    let foundPreferred = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < 80) {
        if (PREFERRED_HEADERS.some(p => p.test(trimmed))) {
          currentSection = 'preferred';
          foundPreferred = true;
          continue;
        }
        if (REQUIRED_HEADERS.some(p => p.test(trimmed))) {
          currentSection = 'required';
          continue;
        }
      }
      if (currentSection === 'required') required.push(line);
      else preferred.push(line);
    }

    // Inline preferred qualifier pass over required lines
    const finalRequired = [];
    const inlinePromoted = [];
    for (const line of required) {
      const lower = line.toLowerCase();
      if (PREFERRED_INLINE.some(phrase => lower.includes(phrase))) {
        inlinePromoted.push(line);
        foundPreferred = true;
      } else {
        finalRequired.push(line);
      }
    }

    return {
      requiredText:  finalRequired.join('\n'),
      preferredText: [...preferred, ...inlinePromoted].join('\n'),
      hasPreferred:  foundPreferred,
    };
  }

  // ---------------------------------------------------------------------------
  // Detect how many years of experience the job requires
  // Returns a number (possibly 0 for intern/new-grad), or null if undetectable
  // ---------------------------------------------------------------------------
  function detectJobExperience(text) {
    // Simple approach: find every "N" or "N+" near the word "years" in the text.
    // Take the minimum — that's the bar. No need to predict sentence structure.
    // We run this on requiredText so company/sidebar noise is already stripped.
    const hits = [];
    for (const m of text.matchAll(/\b(\d+)\+?\s*(?:[-–]\s*\d+\s*)?years?\b/gi)) {
      const n = parseInt(m[1]);
      if (n >= 1 && n <= 20) hits.push(n); // sanity-filter dates and large numbers
    }
    if (hits.length > 0) return Math.min(...hits);

    // No explicit year count — fall back to seniority keywords
    if (/\b(staff|principal|distinguished)\b/i.test(text)) return 8;
    if (/\bsenior\b/i.test(text)) return 5;
    if (/\bmid.?(?:level|senior)\b/i.test(text)) return 3;
    if (/\b(junior|jr\.?)\b/i.test(text)) return 1;
    if (/\b(intern(?:ship)?|co.?op|new\s+grads?|early[- ]career|entry[- ]level)\b/i.test(text)) return 0;
    return null;
  }

  // ---------------------------------------------------------------------------
  // Estimate years of professional experience from resume text.
  //
  // The most common bug: "Jan 2022 – Apr 2026 (Expected)" on a degree line.
  // The old regex grabbed 2022 (the start of university) and computed 4 years.
  // The correct answer is 0 — the student is still in school.
  //
  // Priority:
  //   1. Explicit "X years of experience" claim
  //   2. "(Expected)" year — unambiguous future graduation
  //   3. Degree line → take the LAST (highest) year on that line as graduation
  //   4. Student/enrollment signals → 0
  //   (Work date ranges are intentionally skipped: capstone projects with dates
  //    look identical to job experience in plain text, and inflate the count.)
  // ---------------------------------------------------------------------------
  function detectResumeExperience(text) {
    const currentYear = new Date().getFullYear();

    // 1. Explicit "X years of experience" claim
    const explicit = text.match(
      /(\d+)\+?\s*years?\s+(?:of\s+)?(?:professional\s+|software\s+|industry\s+|relevant\s+)?experience/i
    );
    if (explicit) return Math.min(parseInt(explicit[1]), 40);

    // 2. "(Expected)" graduation year — "Apr 2026 (Expected)"
    const expectedGrad = text.match(/\b(20\d{2})\s*\(expected\)/i);
    if (expectedGrad) {
      const yr = parseInt(expectedGrad[1]);
      if (yr >= 2000 && yr <= currentYear + 5) return Math.max(0, currentYear - yr);
    }

    // 3. Degree line — take the LAST year on the line as graduation year.
    //    "Bachelor of Applied Computer Science Jan 2022 – Apr 2026" → 2026, not 2022.
    const degreeLine = text.match(
      /(?:b\.?s\.?|b\.?e\.?|b\.?a\.?|m\.?s\.?|bachelor|master|ph\.?d\.?)\b[^\n]*/i
    );
    if (degreeLine) {
      const yearsOnLine = [...degreeLine[0].matchAll(/\b(20\d{2})\b/g)].map(m => parseInt(m[1]));
      if (yearsOnLine.length > 0) {
        const gradYear = Math.max(...yearsOnLine); // last (highest) year = graduation
        if (gradYear >= 2000 && gradYear <= currentYear + 5) return Math.max(0, currentYear - gradYear);
      }
    }

    // 4. Student/enrollment signals
    if (/\b(undergraduate|currently\s+enrolled|pursuing\s+(?:a\s+)?(?:b\.s|bachelor|degree)|seeking\s+(?:internship|full.?time))\b/i.test(text)) return 0;

    return null;
  }

  // ---------------------------------------------------------------------------
  // Score the experience match (0–100)
  // ---------------------------------------------------------------------------
  function computeExpScore(jobYears, resumeYears) {
    if (jobYears === null) return null;    // no requirement — N/A
    if (jobYears === 0) return 100;        // intern/new grad — anyone qualifies
    if (resumeYears === null) return null; // requirement exists but can't detect resume years
    return Math.min(100, Math.round((resumeYears / jobYears) * 100));
  }

  // ---------------------------------------------------------------------------
  // Determine overall fit label + one-line qualifier
  // ---------------------------------------------------------------------------
  function getFitLabel(skillScore, expScore) {
    const noExp = expScore === null;

    if (noExp) {
      if (skillScore >= 80) return { label: 'Strong Fit',   qualifier: null };
      if (skillScore >= 60) return { label: 'Good Fit',     qualifier: null };
      if (skillScore >= 40) return { label: 'Moderate Fit', qualifier: null };
      return                       { label: 'Low Fit',      qualifier: null };
    }

    const highSkill = skillScore >= 65;
    const highExp   = expScore   >= 70;

    if (highSkill && highExp)
      return { label: 'Strong Fit',   qualifier: null };
    if (highSkill && expScore >= 50)
      return { label: 'Good Fit',     qualifier: 'slightly below stated experience level' };
    if (highSkill && !highExp)
      return { label: 'Stretch Fit',  qualifier: 'strong technical overlap, below experience level' };
    if (!highSkill && highExp)
      return { label: 'Moderate Fit', qualifier: 'meets experience bar, some skill gaps' };
    if (skillScore >= 40)
      return { label: 'Moderate Fit', qualifier: null };
    return   { label: 'Low Fit',      qualifier: null };
  }

  // ---------------------------------------------------------------------------
  // Generate a one-sentence plain-English summary of the match
  // ---------------------------------------------------------------------------
  function generateExplanation({ matched, missingRequired, skillScore, expScore, jobYears, resumeYears }) {
    function topCat(skills) {
      const counts = {};
      for (const s of skills) {
        for (const [cat, catSkills] of Object.entries(SKILL_CATS)) {
          if (catSkills.includes(s)) { counts[cat] = (counts[cat] || 0) + 1; break; }
        }
      }
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    }

    const hardMissing = missingRequired.filter(m => !m.partial).map(m => m.skill);
    const parts = [];

    // Strength statement
    const matchedCat = topCat(matched);
    if (skillScore >= 70 && matchedCat) {
      const examples = matched
        .filter(s => SKILL_CATS[matchedCat]?.includes(s))
        .slice(0, 3).join(', ');
      parts.push(`Strong match on ${CAT_LABELS[matchedCat]}${examples ? ` (${examples})` : ''}`);
    } else if (skillScore >= 45 && matchedCat) {
      parts.push(`Partial match on ${CAT_LABELS[matchedCat]}`);
    } else if (matched.length > 0) {
      parts.push(`Some matching skills (${matched.slice(0, 3).join(', ')})`);
    } else {
      parts.push('Limited overlap with this role');
    }

    // Experience gap statement
    if (jobYears !== null && resumeYears !== null && resumeYears < jobYears * 0.75) {
      parts.push(`below the stated ${jobYears}+ year experience requirement`);
    } else if (jobYears !== null && resumeYears === null) {
      parts.push(`role targets ${jobYears}+ years of experience`);
    } else if (expScore !== null && expScore >= 100 && skillScore < 65) {
      parts.push('meets the experience level');
    }

    // Missing skills statement
    if (hardMissing.length > 0) {
      const missingCat = topCat(hardMissing);
      const examples = hardMissing.slice(0, 3).join(', ');
      parts.push(
        missingCat
          ? `missing ${CAT_LABELS[missingCat]} (${examples})`
          : `missing ${examples}`
      );
    } else if (missingRequired.length > 0 && missingRequired.every(m => m.partial)) {
      parts.push('all skill gaps have related experience');
    } else if (missingRequired.length === 0) {
      parts.push('all required skills covered');
    }

    const text = parts.join(', ');
    return text.charAt(0).toUpperCase() + text.slice(1) + '.';
  }

  // ---------------------------------------------------------------------------
  // Detect OR groups in job text — lines like:
  //   "experience in one or several of Java, Rust, C/C++, and/or Python"
  // Returns an array of Sets, each Set being the canonical skills in that group.
  // If the resume has ANY skill in a group, the rest are not true gaps.
  // ---------------------------------------------------------------------------
  function detectOrGroups(text) {
    const OR_TRIGGERS = [
      /\bone\s+or\s+(?:several|more)\s+of\b/i,
      /\bone\s+of\s+(?:the\s+following|these)\b/i,
      /\bany\s+(?:one\s+)?of\s+(?:the\s+following)?\b/i,
    ];

    const groups = [];
    for (const sentence of text.split(/[.\n]/)) {
      if (!OR_TRIGGERS.some(p => p.test(sentence))) continue;
      const skills = [];
      for (const [canonical, terms] of Object.entries(SYNONYMS)) {
        if (terms.some(t => textHasTerm(sentence, t))) skills.push(canonical);
      }
      if (skills.length >= 2) groups.push(new Set(skills));
    }
    return groups;
  }

  // Returns true if this skill belongs to a satisfied OR group
  // (i.e., at least one other skill in the same group is in the resume)
  function isOrGroupSatisfied(skill, resumeSkillSet, orGroups) {
    return orGroups.some(group =>
      group.has(skill) && [...group].some(s => s !== skill && resumeSkillSet.has(s))
    );
  }

  // ---------------------------------------------------------------------------
  // For a missing skill, find a cousin in the same family from the resume
  // ---------------------------------------------------------------------------
  function findFamilyMatch(missingSkill, resumeSkillSet) {
    for (const familyData of Object.values(SKILL_FAMILIES)) {
      if (!familyData.skills.includes(missingSkill)) continue;
      const cousin = familyData.skills.find(s => s !== missingSkill && resumeSkillSet.has(s));
      if (cousin) return { via: cousin, family: familyData.name };
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Extract job description text with tiered confidence.
  // Returns { text, confidence: 'high' | 'medium' | 'low' }
  //
  // high   — dedicated description container found (LinkedIn/Indeed specific)
  // medium — broader job-detail panel used; likely includes some noise
  // low    — fell back to article/main/body; results may be noisy
  // ---------------------------------------------------------------------------
  function getJobText() {
    const HIGH = [
      '.jobs-description__content',          // LinkedIn (common)
      '.jobs-box__html-content',             // LinkedIn (alternate)
      '[data-test="job-description"]',       // LinkedIn (data attr)
      '.description__text',                  // LinkedIn (older layout)
      '#jobDescriptionText',                 // Indeed
      '.jobsearch-jobDescriptionText',       // Indeed (alternate)
    ];
    const MEDIUM = [
      '.jobs-description',
      '.jobs-details',
      '.job-details-jobs-unified-top-card__container--two-pane',
    ];
    const LOW = ['article', 'main'];

    for (const sel of HIGH) {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim().length > 100) {
        console.log(`📍 High-confidence job text via: ${sel}`);
        return { text: el.innerText, confidence: 'high' };
      }
    }
    for (const sel of MEDIUM) {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim().length > 100) {
        console.log(`📍 Medium-confidence job text via: ${sel}`);
        return { text: el.innerText, confidence: 'medium' };
      }
    }
    for (const sel of LOW) {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim().length > 100) {
        console.log(`📍 Low-confidence job text via: ${sel}`);
        return { text: el.innerText, confidence: 'low' };
      }
    }
    console.log("📍 Low-confidence: document.body fallback");
    return { text: document.body.innerText || '', confidence: 'low' };
  }

  // ---------------------------------------------------------------------------
  // Strip noise sections from raw job text BEFORE skill matching.
  // State machine: starts in 'include' mode; switches to 'exclude' when a noise
  // header is found; switches back to 'include' when a relevant header is found.
  // Defaults to include so the opening job description (before any header) is kept.
  // ---------------------------------------------------------------------------
  function filterJobSections(rawText, companyName = null) {
    const lines = rawText.split('\n');
    let state = 'include';
    const kept = [];

    // Build a dynamic noise pattern from the detected company name so
    // "About MongoDB" or "About Stripe" is caught even if not in the static list.
    const companyNoiseRe = companyName
      ? new RegExp(`^about\\s+${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
      : null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.length > 0 && trimmed.length < 80) {
        const isNoise = NOISE_SECTION_HEADERS.some(p => p.test(trimmed))
                     || (companyNoiseRe && companyNoiseRe.test(trimmed));

        if (isNoise) {
          state = 'exclude';
          continue;
        }
        if (RELEVANT_SECTION_HEADERS.some(p => p.test(trimmed))) {
          state = 'include';
          kept.push(line); // keep the header so splitJobSections can see it
          continue;
        }
      }

      if (state === 'include') kept.push(line);
    }

    return kept.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Try to read the hiring company's name from the page.
  // Used to prevent counting the company's own name as a matched skill.
  // ---------------------------------------------------------------------------
  function getCompanyName() {
    const selectors = [
      '.jobs-unified-top-card__company-name',
      '.job-details-jobs-unified-top-card__company-name',
      '[data-test="job-detail-company-url"]',
      '.jobsearch-CompanyInfoWithoutHeaderImage .icl-u-lg-mr--sm',
      '.jobsearch-InlineCompanyRating-companyHeader',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim().toLowerCase();
    }
    // Fallback: parse page title "Job Title at Company | LinkedIn"
    const m = document.title.match(/\bat\s+([^|–\-]+)/i);
    if (m) return m[1].trim().toLowerCase();
    return null;
  }

  // ---------------------------------------------------------------------------
  // Message listener
  // ---------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action !== 'CHECK_JOB') return;

    (async () => {
      try {
        // 1. Extract job text with confidence tier
        const { text: rawJob, confidence } = getJobText();

        // 2. Detect company name early so the section filter can use it
        const companyName = getCompanyName();
        console.log(`🏢 Company: ${companyName ?? 'unknown'}`);

        // 3. Strip noise sections (company info, benefits, legal boilerplate)
        const cleanJob = filterJobSections(rawJob, companyName);

        // 3. Split cleaned text into required vs. preferred sections
        const { requiredText, preferredText, hasPreferred } = splitJobSections(cleanJob);

        // 4. Resume text
        const resumeText = await getResumeText();
        if (!resumeText) {
          sendResponse({ error: 'No resume found. Please paste and save your resume first.' });
          return;
        }

        // 5. Experience detection — use requiredText + preferredText, NOT cleanJob.
        //    When confidence is "low" (full-page scan), cleanJob contains sidebar
        //    job listings and other noise. requiredText has already been filtered
        //    down to just the relevant sections of this specific posting.
        const jobYears    = detectJobExperience(requiredText + '\n' + preferredText);
        const resumeYears = detectResumeExperience(resumeText);
        const expScore    = computeExpScore(jobYears, resumeYears);

        // 7. Build resume skill set
        const resumeSkills = new Set();
        for (const [canonical, terms] of Object.entries(SYNONYMS)) {
          if (terms.some(t => textHasTerm(resumeText, t))) resumeSkills.add(canonical);
        }

        // 8. Detect OR groups so "one or several of Java, Rust, C/C++, Python"
        //    doesn't flag Rust and C++ as gaps when Java is already matched.
        const orGroups = detectOrGroups(requiredText);

        // 9. Evaluate each skill mentioned in job post
        const matched          = [];
        const missingRequired  = [];
        const missingPreferred = [];

        for (const [canonical, terms] of Object.entries(SYNONYMS)) {
          const inReq  = terms.some(t => textHasTerm(requiredText, t));
          const inPref = !inReq && terms.some(t => textHasTerm(preferredText, t));
          if (!inReq && !inPref) continue;

          // Company name guard: skip if canonical skill name IS the company name.
          if (companyName) {
            const c = canonical.toLowerCase();
            if (companyName.includes(c) || c.includes(companyName)) {
              console.log(`⚠ Skipping "${canonical}" — company name collision`);
              continue;
            }
          }

          if (resumeSkills.has(canonical)) {
            matched.push(canonical);
          } else if (inReq && isOrGroupSatisfied(canonical, resumeSkills, orGroups)) {
            // Part of an OR group and another skill in the group is matched —
            // don't count this as a gap. Silently drop it.
            console.log(`✅ OR-satisfied: "${canonical}" not required (group already covered)`);
          } else {
            const partial = findFamilyMatch(canonical, resumeSkills);
            (inReq ? missingRequired : missingPreferred).push({ skill: canonical, partial });
          }
        }

        // 6. Skill score — required skills only; partials count 0.5
        const reqTotal   = matched.filter(s => SYNONYMS[s]?.some(t => textHasTerm(requiredText, t))).length
                         + missingRequired.length;
        const reqMatched = matched.filter(s => SYNONYMS[s]?.some(t => textHasTerm(requiredText, t))).length;
        const reqPartial = missingRequired.filter(m => m.partial).length;
        const skillScore = reqTotal > 0
          ? Math.round(((reqMatched + reqPartial * 0.5) / reqTotal) * 100)
          : 0;

        // 7. Overall score — weighted average when exp data exists
        const hasExpData  = expScore !== null;
        const overallScore = hasExpData
          ? Math.round(skillScore * 0.6 + expScore * 0.4)
          : skillScore;

        // 8. Fit label and explanation
        const { label: fitLabel, qualifier: fitQualifier } = getFitLabel(skillScore, expScore);
        const explanation = generateExplanation({
          matched, missingRequired, skillScore, expScore, jobYears, resumeYears,
        });

        console.log(`📊 Skill: ${skillScore}% | Exp: ${expScore ?? 'N/A'}% | Overall: ${overallScore}% | ${fitLabel}`);

        sendResponse({
          skillScore, expScore, overallScore,
          fitLabel, fitQualifier, explanation,
          jobYears, resumeYears, confidence,
          matched, missingRequired, missingPreferred, hasPreferred,
        });
      } catch (err) {
        console.error('❌ Error:', err);
        sendResponse({ error: err.message });
      }
    })();

    return true;
  });

  function getResumeText() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['resumeText'], (data) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(data.resumeText || '');
      });
    });
  }
})();
