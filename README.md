# ResumeRadar

ResumeRadar is a Chrome extension that analyzes job postings and evaluates how well a candidate’s resume matches the role.

It goes beyond basic keyword matching by interpreting real-world job descriptions, handling ambiguous requirements, and producing explainable fit scores.

---

## Overview

Job postings are messy. They mix requirements, examples, company descriptions, legal text, and vague language.

Most resume tools fail because they assume:
, clean structure  
, explicit requirements  
, exact keyword matches  

ResumeRadar is built to handle real-world postings, not ideal ones.

---

## Features

### Context-Aware Job Parsing
, Extracts visible job descriptions from platforms like LinkedIn  
, Filters out noise such as benefits, company info, and legal sections  
, Splits content into required vs preferred signals  

---

### Intelligent Skill Matching
, Supports flexible language like “Java or Python”  
, Avoids treating example lists as strict requirements  
, Matches skills both explicitly and conceptually  

Example:  
API design → matched via REST API experience  

---

### Concept-Level Matching
, Maps abstract requirements to related skills  
, Infers relevant experience even when exact terms differ  
, Prevents double-counting when both concept and specific skill appear  

---

### Experience & Career Stage Detection
, Distinguishes between entry-level, early career, mid-level, and senior roles  
, Handles real-world phrasing like “0–5 years” and “new grad”  
, Supports “internship or project experience” logic  
, Avoids false positives like “18 years of age or older”  

---

### Confidence-Aware Scoring
, Detects when extraction is unreliable  
, Avoids misleading scores when data is weak  
, Uses N/A instead of forcing incorrect percentages  

---

### Explainable Output
, Provides human-readable reasoning  
, Explains inferred matches  

Example:  
“API design inferred via REST; TypeScript covered via JavaScript.”

---

## How It Works

1. Extraction  
   , Reads visible job description from the page  
   , Assigns confidence level (container vs full-page scan)  

2. Cleaning  
   , Removes irrelevant sections  
   , Normalizes and structures text  

3. Parsing  
   , Detects required vs preferred signals  
   , Extracts skills, experience, and career stage  
   , Handles OR conditions and flexible phrasing  

4. Matching  
   , Compares job requirements with resume content  
   , Applies explicit and concept-level matching  

5. Scoring  
   , Skill Match  
   , Experience Match  
   , Overall Fit  
   , Confidence-aware adjustments  

6. Explanation  
   , Generates a concise, human-readable summary  

---

## Example Output

, Skill Match: 70%  
, Experience Match: Entry-Level Fit  
, Overall Fit: Stretch Fit  

Explanation:  
“Strong technical overlap. API design inferred via REST; TypeScript covered via JavaScript. Some experience gaps remain.”

---

## Key Improvements (Phase 1 + Phase 2)

ResumeRadar evolved from a basic keyword matcher into a structured evaluator by addressing real-world failures:

### Phase 1
, Fixed experience misinterpretation (age vs years)  
, Added career stage detection  
, Improved OR condition handling  
, Prevented false 0% scores  
, Introduced confidence-aware scoring  

### Phase 2
, Added concept-level matching  
, Improved explanation clarity  
, Introduced confidence-aware messaging  
, Reduced rigid dependency on exact keywords  

---

## Tech Stack

, JavaScript (Chrome Extension - Manifest V3)  
, DOM parsing and content scripts  
, Rule-based NLP and pattern matching  

---

## Limitations

, Depends on visible page structure  
, Performance varies with extraction confidence  
, Concept mapping is limited to predefined relationships  

---

## Future Improvements

, Expand concept mapping coverage  
, Improve handling of highly narrative job postings  
, Optional semantic matching (embeddings or LLM-assisted)  
, Multi-job comparison and tracking  

---

## Author

Gavin Sharma  
Bachelor of Applied Computer Science, Dalhousie University  
