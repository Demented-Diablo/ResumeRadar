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
    // Embedded / systems — added for domain mismatch detection and skill gap visibility
    rtos:           ['rtos', 'freertos', 'vxworks', 'zephyr', 'real-time os', 'real-time operating'],
    firmware:       ['firmware', 'embedded software', 'embedded systems', 'bare metal', 'device driver', 'bsp'],
    autosar:        ['autosar', 'iso 26262', 'functional safety', 'can bus', 'canbus', 'lin bus', 'automotive software'],
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
  // Concept map — abstract phrases found in job text → related canonical skills.
  //
  // Purpose: job postings often say "API design" or "cloud infrastructure" instead
  // of naming specific skills. When a concept phrase is detected in the job text
  // but none of its specific skills were also named, we check the resume for any
  // of those skills and surface "API design inferred via rest" instead of silence.
  //
  // Rules:
  //   • Only fires when the concept phrase appears but NO specific skill from the
  //     list also appears in the job text (avoids double-counting).
  //   • Does NOT affect the numeric skill score — purely informational.
  //   • Concept matches are shown with a distinct badge and in the explanation.
  // ---------------------------------------------------------------------------
  const CONCEPT_MAP = {
    // API / integration
    'api design':                ['rest', 'graphql', 'grpc'],
    'api development':           ['rest', 'graphql', 'grpc'],
    'api integration':           ['rest', 'graphql', 'websockets'],
    'web services':              ['rest', 'graphql', 'grpc'],
    'service integration':       ['rest', 'graphql', 'kafka', 'grpc'],
    'integrations':              ['rest', 'graphql', 'kafka', 'websockets'],
    // Backend — short forms to catch "backend" without "development"
    'backend development':       ['nodejs', 'python', 'java', 'go', 'ruby', 'csharp'],
    'backend systems':           ['nodejs', 'python', 'java', 'go', 'express', 'spring'],
    'backend engineering':       ['nodejs', 'python', 'java', 'go', 'ruby', 'csharp'],
    'server-side development':   ['nodejs', 'python', 'java', 'go'],
    'server side development':   ['nodejs', 'python', 'java', 'go'],
    // Frontend
    'frontend development':      ['javascript', 'react', 'angular', 'vue', 'nextjs'],
    'front-end development':     ['javascript', 'react', 'angular', 'vue'],
    'ui development':            ['react', 'angular', 'vue', 'javascript'],
    'web development':           ['javascript', 'react', 'html', 'css'],
    // Cloud / infra — including short "infrastructure" alone
    'cloud infrastructure':      ['aws', 'azure', 'gcp'],
    'cloud services':            ['aws', 'azure', 'gcp'],
    'cloud deployment':          ['aws', 'azure', 'gcp', 'docker'],
    'cloud computing':           ['aws', 'azure', 'gcp'],
    'cloud native':              ['aws', 'azure', 'gcp', 'kubernetes', 'docker'],
    'infrastructure':            ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform'],
    'agent infrastructure':      ['docker', 'kubernetes', 'aws', 'gcp'],
    // Data
    'database design':           ['sql', 'mongodb', 'redis', 'cassandra'],
    'database management':       ['sql', 'mongodb', 'redis'],
    'data modeling':             ['sql', 'mongodb', 'cassandra'],
    'data pipelines':            ['kafka', 'spark', 'sql'],
    'data storage':              ['sql', 'mongodb', 'redis', 'dynamodb'],
    // DevOps / infra
    'containerization':          ['docker', 'kubernetes'],
    'container orchestration':   ['kubernetes', 'docker'],
    'devops practices':          ['cicd', 'docker', 'linux'],
    'deployment pipeline':       ['cicd', 'docker', 'git'],
    'infrastructure automation': ['terraform', 'cicd'],
    // ML / AI
    'data science':              ['python', 'pandas', 'numpy', 'machinelearning'],
    'machine learning models':   ['machinelearning', 'tensorflow', 'pytorch'],
    'ai development':            ['machinelearning', 'deeplearning', 'python'],
    'ai agents':                 ['python', 'machinelearning', 'deeplearning'],
    // Distributed systems
    'microservice architecture': ['microservices', 'docker', 'kafka'],
    'distributed systems':       ['kafka', 'redis', 'microservices'],
    'system design':             ['microservices', 'kafka', 'docker', 'redis'],
    'event-driven architecture': ['kafka', 'rabbitmq', 'microservices'],
    // General engineering
    'version control':           ['git'],
    'source control':            ['git'],
    'agile methodology':         ['agile'],
    'test-driven development':   ['testing'],
    'unit testing':              ['testing'],
    'integration testing':       ['testing'],
    'automated testing':         ['testing'],
    'object-oriented programming': ['java', 'python', 'csharp', 'kotlin'],
    'scripting':                 ['python', 'bash', 'javascript'],
    'production code':           ['nodejs', 'python', 'java', 'go', 'javascript'],
    'production systems':        ['docker', 'aws', 'cicd', 'nodejs', 'python'],
  };

  // ---------------------------------------------------------------------------
  // Domain profiles — used exclusively for domain mismatch detection.
  //
  // IMPORTANT DESIGN DECISION: only domains that are genuinely distinct career
  // tracks from general software engineering are included here.
  // webBackend, webFrontend, cloudDevOps are intentionally ABSENT because they
  // are the candidate's home territory — matching there should never be a
  // "mismatch." These profiles catch the GM-class failure where a posting is
  // fundamentally about embedded systems or statistical research, not software
  // product engineering.
  //
  // Mismatch fires when:
  //   jobScore ≥ 4  (strong domain signal in the job text)
  //   resumeScore = 0  (candidate has zero presence in that domain)
  // We err heavily toward NOT flagging mismatch — one keyword on either side
  // suppresses it.
  // ---------------------------------------------------------------------------
  const DOMAIN_PROFILES = {
    embedded: {
      label: 'Embedded / Systems / Hardware-adjacent Engineering',
      // Canonical SYNONYMS keys whose presence scores the domain
      skills: ['cplusplus', 'rust', 'matlab', 'rtos', 'firmware', 'autosar'],
      // Raw text phrases — strong signals even if not individually in SYNONYMS
      keywords: [
        'embedded', 'firmware', 'rtos', 'real-time', 'microcontroller', 'microprocessor',
        'fpga', 'plc', 'can bus', 'automotive', 'autosar', 'iso 26262',
        'functional safety', 'controls engineer', 'control systems',
        'motor control', 'powertrain', 'chassis', 'adas',
        'device driver', 'bare metal', 'system on chip', 'verilog', 'vhdl',
        'oscilloscope', 'jtag', 'bootloader',
      ],
    },
    dataScience: {
      label: 'Data Science / Statistical Modeling',
      skills: ['machinelearning', 'deeplearning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'spark', 'r', 'matlab'],
      keywords: [
        'data scientist', 'statistical modeling', 'predictive modeling',
        'feature engineering', 'hypothesis testing', 'regression analysis',
        'research scientist', 'quantitative analyst', 'a/b testing',
        'experimental design', 'causal inference', 'bayesian',
      ],
    },
    mobile: {
      label: 'iOS / Android Mobile Engineering',
      skills: ['swift', 'kotlin'],
      keywords: [
        'ios engineer', 'ios developer', 'android engineer', 'android developer',
        'xcode', 'android studio', 'app store', 'google play',
        'react native developer', 'flutter developer', 'mobile-first',
      ],
    },
    security: {
      label: 'Cybersecurity / Security Engineering',
      skills: ['security'],
      keywords: [
        'penetration testing', 'pen testing', 'threat modeling', 'vulnerability assessment',
        'incident response', 'security operations center', 'soc analyst',
        'red team', 'blue team', 'malware analysis', 'digital forensics',
        'intrusion detection', 'zero trust', 'siem', 'devsecops',
      ],
    },
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
    /^(?:we\s+are\s+an?\s+)?equal\s+opportunity\s+employer/i,
    /^equal\s+opportunity\s+statement$/i,
    /^non.?discrimination\s+(?:policy|statement)$/i,
    /^affirmative\s+action/i,
    /^diversity(?:\s+and\s+inclusion)?$/i,
    /^privacy\s+(?:policy|notice|statement)$/i,
    /^(?:apply\s+now|how\s+to\s+apply)$/i,
    // "About MongoDB", "About Stripe" — "About" followed by a proper noun (not "the role/job")
    /^about\s+(?!the\s+(?:role|job|position|opportunity))[A-Z]/,
    // Interview / hiring process sections
    /^(?:our\s+)?(?:interview|hiring)\s+(?:process|steps?)$/i,
    /^how\s+(?:we\s+)?(?:hire|interview|work)$/i,
    // Physical / legal / work authorization boilerplate
    /^physical\s+(?:demands?|requirements?)$/i,
    /^work\s+authorization$/i,
    /^(?:legal\s+)?authorization\s+(?:to\s+work|requirements?)$/i,
    // Location / remote policy blocks
    /^(?:work\s+)?(?:location|arrangement|environment|schedule)$/i,
    /^(?:remote|hybrid|on.?site)\s+(?:work\s+)?(?:policy|info|details?)?$/i,
    // Salary disclosure blocks (state-mandated postings)
    /^(?:salary|pay|compensation)\s+(?:range|information|disclosure)$/i,
    // Misc boilerplate
    /^(?:about\s+the\s+)?application\s+process$/i,
    /^what\s+(?:to\s+)?expect$/i,
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
    // Step 1: Entry-level / intern signals are checked FIRST.
    // This prevents "0–3 years (entry level welcome)" from returning 3.
    if (/\b(intern(?:ship)?|co.?op|new\s+grads?|early[- ]career|entry[- ]level)\b/i.test(text)) return 0;

    // Step 2: "0–N years" or "0 to N years" explicitly means entry-level.
    if (/\b0\s*(?:[-–]|to)\s*\d+\s*years?\b/i.test(text)) return 0;

    // Step 3: Numeric year scan with an age-context filter.
    // Phrases like "18 years of age or older", "must be 21 years old" look identical
    // to experience requirements unless we check the surrounding context.
    const AGE_CONTEXT = /\b(age|years?\s+old|of\s+age|older|legal\s+age|eligible|eligib|citizen|authoriz|work\s+permit|must\s+be\s+\d)\b/i;

    const hits = [];
    for (const m of text.matchAll(/\b(\d+)\+?\s*(?:[-–]\s*\d+\s*)?years?\b/gi)) {
      const n = parseInt(m[1]);
      if (n < 1 || n > 20) continue; // sanity-filter dates (2024) and absurd counts
      // Check a 80-character window around the match for age/legal noise
      const ctx = text.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80);
      if (AGE_CONTEXT.test(ctx)) continue;
      hits.push(n);
    }
    if (hits.length > 0) return Math.min(...hits);

    // Step 4: No explicit year count — fall back to seniority keywords.
    if (/\b(staff|principal|distinguished)\b/i.test(text)) return 8;
    if (/\bsenior\b/i.test(text)) return 5;
    if (/\bmid.?(?:level|senior)\b/i.test(text)) return 3;
    if (/\b(junior|jr\.?)\b/i.test(text)) return 1;
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
  // Classify career stage for both the job and the candidate.
  // Returns { jobStage, resumeStage, fit }
  //
  //   jobStage / resumeStage: 'intern' | 'entry' | 'mid' | 'senior' | 'unknown'
  //   fit:  'aligned' | 'stretch' | 'overqualified' | 'unknown'
  //
  // Used to:
  //   (a) suppress or explain the experience score when stage is clear
  //   (b) add a human-readable label to the UI ("Entry Level role")
  // ---------------------------------------------------------------------------
  function detectCareerStage(jobText, resumeText) {
    // --- Job stage ---
    const jobIsIntern = /\b(intern(?:ship)?|co.?op)\b/i.test(jobText);
    const jobIsEntry  = !jobIsIntern && /\b(new\s+grads?|early[- ]career|entry[- ]level|junior|jr\.?|0\s*[-–]\s*\d+\s*years?)\b/i.test(jobText);
    const jobIsStaff  = /\b(staff\s+engineer|principal\s+engineer|distinguished\s+engineer)\b/i.test(jobText);
    const jobIsSenior = !jobIsStaff && /\b(senior|lead\s+(?:engineer|developer|software))\b/i.test(jobText);
    const jobIsMid    = !jobIsEntry && !jobIsSenior && !jobIsStaff
                     && /\bmid.?(?:level|senior)\b/i.test(jobText);

    const jobStage = jobIsIntern ? 'intern'
      : jobIsEntry  ? 'entry'
      : jobIsStaff  ? 'staff'
      : jobIsSenior ? 'senior'
      : jobIsMid    ? 'mid'
      : 'unknown';

    // --- Resume / candidate stage ---
    const resumeIsStudent = /\b(intern(?:ship)?|undergraduate|currently\s+enrolled|pursuing\s+(?:a\s+)?(?:b\.s|bachelor|degree)|expected|seeking\s+(?:internship|co.?op))\b/i.test(resumeText);
    const explicit = resumeText.match(/(\d+)\+?\s*years?\s+of\s+(?:professional\s+|software\s+|industry\s+|relevant\s+)?experience/i);

    let resumeStage = 'unknown';
    if (resumeIsStudent) {
      resumeStage = 'entry';
    } else if (explicit) {
      const y = parseInt(explicit[1]);
      resumeStage = y === 0 ? 'entry'
        : y <= 2  ? 'entry'
        : y <= 5  ? 'mid'
        : y <= 9  ? 'senior'
        : 'staff';
    }

    // --- Fit classification ---
    let fit = 'unknown';
    if (jobStage !== 'unknown' && resumeStage !== 'unknown') {
      const ORDER = { intern: 0, entry: 1, mid: 2, senior: 3, staff: 4 };
      const jRank = ORDER[jobStage] ?? -1;
      const rRank = ORDER[resumeStage] ?? -1;
      if (jRank === rRank)       fit = 'aligned';
      else if (rRank > jRank)    fit = 'overqualified';
      else                       fit = 'stretch';
    }

    return { jobStage, resumeStage, fit };
  }

  // ---------------------------------------------------------------------------
  // Domain mismatch detection.
  //
  // Scores the job text against DOMAIN_PROFILES to find whether this role is
  // in a specialist engineering domain (embedded, data science, mobile, security).
  // Then checks the resume for any presence in that domain.
  //
  // Conservative by design: only fires when job signal is strong (≥ 4 pts) AND
  // resume has ZERO presence. One keyword hit on the resume side suppresses it.
  // This satisfies the core principle: rarely tell someone to skip a relevant job.
  //
  // Returns { mismatch, jobDomain, mismatchReason }
  // ---------------------------------------------------------------------------
  function detectDomainFit(cleanJobText, resumeText) {
    const jobLower    = cleanJobText.toLowerCase();
    const resumeLower = resumeText.toLowerCase();

    let topDomainId = null;
    let topScore    = 0;

    for (const [domainId, profile] of Object.entries(DOMAIN_PROFILES)) {
      let score = 0;
      // Skill-based signals — weight 2 (more specific, less likely to appear by accident)
      for (const skillKey of profile.skills) {
        const terms = SYNONYMS[skillKey] ?? [];
        if (terms.some(t => textHasTerm(jobLower, t))) score += 2;
      }
      // Keyword signals — weight 1
      for (const kw of profile.keywords) {
        if (jobLower.includes(kw)) score += 1;
      }
      if (score > topScore) { topScore = score; topDomainId = domainId; }
    }

    // Signal too weak — this is not a specialist-domain posting
    if (topScore < 4) return { mismatch: false };

    // Measure resume presence in the same domain
    const profile = DOMAIN_PROFILES[topDomainId];
    let resumeScore = 0;
    for (const skillKey of profile.skills) {
      const terms = SYNONYMS[skillKey] ?? [];
      if (terms.some(t => textHasTerm(resumeLower, t))) resumeScore += 2;
    }
    for (const kw of profile.keywords) {
      if (resumeLower.includes(kw)) resumeScore += 1;
    }

    if (resumeScore > 0) return { mismatch: false };

    return {
      mismatch:        true,
      jobDomain:       profile.label,
      mismatchReason: `role is in ${profile.label.toLowerCase()}`,
    };
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
  function getFitLabel(skillScore, expScore, domainFit) {
    // Low-confidence extraction — can't assess
    if (skillScore === null) {
      return { label: 'Low Confidence', qualifier: 'could not extract enough structure from this posting' };
    }

    // Domain mismatch overrides all scoring — role is in a different engineering track
    if (domainFit?.mismatch) {
      return { label: 'Domain Mismatch', qualifier: domainFit.mismatchReason };
    }

    const noExp = expScore === null;

    // No experience data — rely on skill score alone
    if (noExp) {
      if (skillScore >= 80) return { label: 'Strong Fit',   qualifier: null };
      if (skillScore >= 60) return { label: 'Good Fit',     qualifier: null };
      if (skillScore >= 35) return { label: 'Moderate Fit', qualifier: null };
      return                       { label: 'Low Fit',      qualifier: null };
    }

    // Thresholds raised: Strong Fit now requires 75% skill coverage (was 65%).
    // This makes the label mean something — 65% with gaps is a stretch, not strong.
    // Moderate Fit floor lowered to 35% to reduce false "Low Fit" on partial evidence.
    const highSkill = skillScore >= 75;
    const highExp   = expScore   >= 70;

    if (highSkill && highExp)
      return { label: 'Strong Fit',   qualifier: null };
    if (highSkill && expScore >= 50)
      return { label: 'Good Fit',     qualifier: 'slightly below stated experience level' };
    if (highSkill && !highExp)
      return { label: 'Stretch Fit',  qualifier: 'strong technical overlap, below experience level' };
    if (!highSkill && highExp)
      return { label: 'Moderate Fit', qualifier: 'meets experience bar, some skill gaps' };
    if (skillScore >= 35)
      return { label: 'Moderate Fit', qualifier: null };
    return   { label: 'Low Fit',      qualifier: null };
  }

  // ---------------------------------------------------------------------------
  // Generate a plain-English summary of the match.
  //
  // Produces up to two sentences:
  //   1. Primary assessment — strength, experience gap, hard skill gaps.
  //   2. Inference sentence — concept matches and partial family matches,
  //      e.g. "API design inferred via rest; typescript covered via javascript."
  //
  // Confidence-aware: low-confidence extractions get a soft prefix so the user
  // knows the scores are based on a noisy full-page scan.
  // ---------------------------------------------------------------------------
  function generateExplanation({ matched, missingRequired, conceptMatched = [], skillScore, expScore, jobYears, resumeYears, confidence, domainFit }) {
    // Domain mismatch — explanation focuses on the domain gap, not skill keywords
    if (domainFit?.mismatch) {
      const base = `Role requires ${domainFit.jobDomain.toLowerCase()} background. The core technical requirements are in a different engineering discipline from your profile.`;
      return confidence === 'low' ? 'Full-page scan — ' + base.charAt(0).toLowerCase() + base.slice(1) : base;
    }
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
    const partialGaps = missingRequired.filter(m => m.partial);
    const parts = [];

    // --- Sentence 1: Primary assessment ---

    // Strength clause
    if (skillScore === null) {
      parts.push('Could not identify required skills from this posting');
    } else {
      const matchedCat = topCat(matched);
      if (skillScore >= 70 && matchedCat) {
        const examples = matched.filter(s => SKILL_CATS[matchedCat]?.includes(s)).slice(0, 3).join(', ');
        parts.push(`Strong match on ${CAT_LABELS[matchedCat]}${examples ? ` (${examples})` : ''}`);
      } else if (skillScore >= 45 && matchedCat) {
        parts.push(`Partial match on ${CAT_LABELS[matchedCat]}`);
      } else if (matched.length > 0) {
        parts.push(`Some matching skills (${matched.slice(0, 3).join(', ')})`);
      } else if (conceptMatched.length > 0) {
        // No exact skills matched but concepts are covered — lead with that
        const c = conceptMatched[0];
        parts.push(`${c.concept} experience inferred from ${c.via}`);
      } else {
        parts.push('Limited overlap with this role');
      }
    }

    // Experience clause
    if (jobYears !== null && resumeYears !== null && resumeYears < jobYears * 0.75) {
      parts.push(`below the stated ${jobYears}+ year experience requirement`);
    } else if (jobYears !== null && resumeYears === null) {
      parts.push(`role targets ${jobYears}+ years of experience`);
    } else if (expScore !== null && expScore >= 100 && skillScore !== null && skillScore < 65) {
      parts.push('meets the experience level');
    }

    // Hard gaps clause
    if (hardMissing.length > 0) {
      const missingCat = topCat(hardMissing);
      const examples   = hardMissing.slice(0, 3).join(', ');
      parts.push(missingCat
        ? `missing ${CAT_LABELS[missingCat]} (${examples})`
        : `missing ${examples}`
      );
    } else if (missingRequired.length === 0 && conceptMatched.length === 0 && skillScore !== null) {
      parts.push('all required skills covered');
    }

    let sentence1 = parts.join(', ');
    sentence1 = sentence1.charAt(0).toUpperCase() + sentence1.slice(1) + '.';

    // --- Sentence 2: Inference details ---
    // Concept matches: "API design inferred via rest"
    // Partial matches: "typescript covered via javascript"
    // These replace the old generic "all skill gaps have related experience".
    const inferences = [
      ...conceptMatched.filter(c => c.inReq).slice(0, 2)
        .map(c => `${c.concept} inferred via ${c.via}`),
      ...partialGaps.slice(0, 2)
        .map(m => `${m.skill} covered via ${m.partial.via}`),
    ];

    let sentence2 = '';
    if (inferences.length > 0) {
      const raw = inferences.join('; ');
      sentence2 = raw.charAt(0).toUpperCase() + raw.slice(1) + '.';
    }

    // --- Confidence prefix (low confidence only) ---
    let result = sentence2 ? `${sentence1} ${sentence2}` : sentence1;
    if (confidence === 'low') {
      result = 'Full-page scan — ' + result.charAt(0).toLowerCase() + result.slice(1);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Detect OR groups in job text — lines like:
  //   "experience in one or several of Java, Rust, C/C++, and/or Python"
  // Returns an array of Sets, each Set being the canonical skills in that group.
  // If the resume has ANY skill in a group, the rest are not true gaps.
  // ---------------------------------------------------------------------------
  function detectOrGroups(text) {
    const OR_TRIGGERS = [
      // Explicit "pick one" phrasing
      /\bone\s+or\s+(?:several|more)\s+of\b/i,
      /\bone\s+of\s+(?:the\s+following|these)\b/i,
      /\bany\s+(?:one\s+)?of\s+(?:the\s+following)?\b/i,
      // Illustrative list markers — the list is an example, not a checklist
      /\bsuch\s+as\b/i,
      /\bincluding\s+but\s+not\s+limited\s+to\b/i,
      /\be\.g\b/i,
      /\bfor\s+example\b/i,
      /\b(?:technologies?|tools?|languages?|frameworks?|platforms?)\s+(?:like|such\s+as|including)\b/i,
      /\bor\s+(?:similar|equivalent|comparable)\b/i,
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
  // Concept-level matching pass.
  //
  // After the main skill loop has run, scan the job text for abstract phrases
  // from CONCEPT_MAP. Only processes a concept when none of its specific skills
  // already appeared in the job text (to avoid double-counting "API design" when
  // "REST API" was also listed and already handled by the main loop).
  //
  // Returns:
  //   conceptMatched — concept found in job, resume covers ≥1 related skill
  //   conceptGaps    — concept found in job, resume has no related skill
  //
  // Each item: { concept: string, via: string|null, inReq: boolean }
  // ---------------------------------------------------------------------------
  function matchConcepts(requiredText, preferredText, resumeSkills, jobDetectedCanonicals) {
    const conceptMatched = [];
    const conceptGaps    = [];

    for (const [phrase, relatedCanonicals] of Object.entries(CONCEPT_MAP)) {
      const inReq  = textHasTerm(requiredText, phrase);
      const inPref = !inReq && textHasTerm(preferredText, phrase);
      if (!inReq && !inPref) continue;

      // If any of this concept's specific skills were already detected in the job
      // text by the main skill loop, the concept is already covered — skip it.
      if (relatedCanonicals.some(c => jobDetectedCanonicals.has(c))) continue;

      // None of the specific skills appeared explicitly — check resume.
      const via = relatedCanonicals.find(c => resumeSkills.has(c));
      if (via) {
        conceptMatched.push({ concept: phrase, via, inReq });
      } else {
        conceptGaps.push({ concept: phrase, inReq });
      }
    }

    return { conceptMatched, conceptGaps };
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
      '.jobs-description__content',          // LinkedIn job page (common)
      '.jobs-box__html-content',             // LinkedIn job page (alternate)
      '[data-test="job-description"]',       // LinkedIn (data attr)
      '.description__text',                  // LinkedIn (older layout)
      // LinkedIn search results panel — job description rendered in right pane
      '#job-details',                        // LinkedIn search panel (most reliable)
      '.jobs-description-content__text--large', // LinkedIn search panel text block
      '.jobs-description-content',          // LinkedIn search panel container
      '#jobDescriptionText',                 // Indeed
      '.jobsearch-jobDescriptionText',       // Indeed (alternate)
    ];
    const MEDIUM = [
      '.jobs-description',
      '.jobs-details',
      '.job-details-jobs-unified-top-card__container--two-pane',
      '.scaffold-layout__detail',            // LinkedIn search right-column wrapper
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

      if (state === 'include') {
        // Even in include mode, drop individual lines that are EEO/legal boilerplate.
        // These appear as long paragraphs (no section header to trigger exclude state)
        // but contain technology words (e.g. "AI used in screening") that pollute
        // skill matching and domain detection.
        const EEO_INLINE = /\b(equal opportunity employer|affirmative action|regardless of race|regardless of sex|regardless of gender|applicable law prohibits|protected veteran|disability status|applicant.*\bai\b|\bai\b.*(?:screening|recruitment|hiring)|recruitment process.*automat)\b/i;
        if (EEO_INLINE.test(trimmed)) continue;

        kept.push(line);
      }
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

        // 6. Skill score — required skills only; partials count 0.5.
        //    Returns null (not 0) when no required skills were detected at all —
        //    that means the extraction didn't find structure, not that the candidate
        //    has zero overlap.
        const reqMatched = matched.filter(s => SYNONYMS[s]?.some(t => textHasTerm(requiredText, t))).length;
        const reqPartial = missingRequired.filter(m => m.partial).length;
        const reqTotal   = reqMatched + missingRequired.length;
        const skillScore = reqTotal > 0
          ? Math.round(((reqMatched + reqPartial * 0.5) / reqTotal) * 100)
          : null; // null = "couldn't assess" — not the same as 0%

        // 7. Career stage classification (independent of year-based expScore)
        const careerStage = detectCareerStage(requiredText + '\n' + preferredText, resumeText);

        // Domain mismatch check — uses cleanJob (pre-split) so responsibility
        // sections like "you'll work on embedded systems" are also scanned.
        const domainFit = detectDomainFit(cleanJob, resumeText);
        if (domainFit.mismatch) console.log(`🚫 Domain mismatch: ${domainFit.jobDomain}`);

        // 8. Concept-level matching — catches abstract phrases like "API design"
        //    that the keyword loop misses when no specific skill was also named.
        const jobDetectedCanonicals = new Set([
          ...matched,
          ...missingRequired.map(m => m.skill),
          ...missingPreferred.map(m => m.skill),
        ]);
        // Concept matching is only reliable when the main skill loop found at
        // least some required skills — meaning the posting had enough structure
        // for `requiredText` to be meaningful. When skillScore is null, the entire
        // job text bled into requiredText (narrative or low-confidence extraction),
        // and concept phrases will fire on responsibilities/context prose rather
        // than actual requirements. Suppress concept output in that case.
        const { conceptMatched, conceptGaps } = skillScore !== null
          ? matchConcepts(requiredText, preferredText, resumeSkills, jobDetectedCanonicals)
          : { conceptMatched: [], conceptGaps: [] };

        // 9. Overall score — weighted average when all data exists.
        //    Propagates null if either component is null.
        const hasExpData   = expScore !== null;
        const overallScore = skillScore === null ? null
          : hasExpData ? Math.round(skillScore * 0.6 + expScore * 0.4)
          : skillScore;

        // 10. Fit label and explanation
        const { label: fitLabel, qualifier: fitQualifier } = getFitLabel(skillScore, expScore, domainFit);
        const explanation = generateExplanation({
          matched, missingRequired, conceptMatched, skillScore, expScore, jobYears, resumeYears, confidence, domainFit,
        });

        console.log(`📊 Skill: ${skillScore ?? 'N/A'}% | Exp: ${expScore ?? 'N/A'}% | Overall: ${overallScore ?? 'N/A'}% | ${fitLabel}`);
        if (conceptMatched.length) console.log('🔍 Concept matches:', conceptMatched.map(c => `${c.concept} → ${c.via}`).join(', '));

        sendResponse({
          skillScore, expScore, overallScore,
          fitLabel, fitQualifier, explanation,
          jobYears, resumeYears, confidence,
          careerStage, domainFit, conceptMatched, conceptGaps,
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
