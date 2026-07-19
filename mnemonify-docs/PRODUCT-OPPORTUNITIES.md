# Product Opportunities

**Product:** Mnemonify  
**Tagline:** Learning creation for everyone.  
**Values:** Open, Simple, Flexible, Community

## 1. Strategic direction

Mnemonify should evolve from a capable open-source authoring tool into a general learning-engineering platform that helps authors create learning experiences that are aligned, active, measurable, accessible, maintainable, and portable.

Its differentiation is not primarily the number of block types it offers. Its differentiation is the combination of:

- simple responsive authoring;
- advanced but understandable interaction logic;
- instructional recipes and starter packs;
- explicit objective, content, practice, and assessment mapping;
- deterministic course analysis;
- maintenance and change-impact tooling;
- open formats and self-hosting.

Pathology and medical education should serve as an initial proving ground and flagship starter-pack opportunity, not as a constraint on the core architecture.

## 2. Purpose

Mnemonify exists to make capable digital learning creation accessible to educators, solo instructional designers, nonprofits, community colleges, professional education teams, and small organizations that cannot justify enterprise authoring-tool costs or complexity.

The product should occupy the space between two common extremes:

- simple page-based tools that are fast to learn but limited in interactivity and instructional guidance;
- powerful slide-based tools that support logic but require specialist skills and often produce fragile responsive experiences.

Mnemonify should not only help users assemble content. It should help them determine whether the resulting experience has coherent objectives, relevant instruction, meaningful practice, useful feedback, valid assessment, and a realistic path to transfer and application.

Mnemonify combines:

- document-like, block-based authoring;
- enforced responsive behavior;
- variables, triggers, conditions, states, and branching;
- objective, content, practice, and assessment mapping;
- accessible learner experiences;
- open formats and self-hosting;
- SCORM and standalone publishing;
- a low-friction learning curve for non-developers.

## 3. Product promise

A first-time author should be able to create and publish a credible responsive learning experience in one sitting, without code, installation, or formal authoring-tool training.

As the course develops, Mnemonify should help the author answer:

- What should learners be able to do?
- Where is each objective taught?
- Where do learners practice it?
- Where is it assessed?
- Does the assessment match the intended level of performance?
- What is missing, duplicated, inaccessible, broken, or difficult to maintain?

Advanced capability should appear progressively. Users should not need to understand the internal data model or trigger engine to complete common teaching tasks.

## 4. Target audience

### Primary: solo educator or instructional designer

Needs:

- immediate browser access;
- a guided starting point;
- reliable design defaults;
- simple media and assessment workflows;
- no code;
- affordable or free delivery;
- practical guidance on instructional quality.

### Secondary: small instructional-design, professional education, or L&D team

Needs:

- shared courses and assets;
- repeatable templates;
- objective and assessment mapping;
- review and approval;
- SCORM publishing;
- version history;
- maintainable interaction logic;
- deterministic quality reporting.

### Tertiary: self-hosting institution

Needs:

- documented deployment;
- transparent data ownership;
- maintainable upgrades;
- security controls;
- open-source licensing;
- extension points;
- institution-specific analyzer profiles and standards.

### Initial validation audience

Mnemonify should first validate its advanced learning-engineering capabilities with instructional designers, professional education teams, and subject-matter experts producing structured case-based, competency-based, certification, or continuing education.

Pathology and medical education provide a strong initial validation environment because they require:

- image-rich and case-based learning;
- progressive disclosure;
- decision practice;
- detailed feedback;
- objective and assessment alignment;
- external specialist platforms through embeds;
- rigorous editorial review;
- long-term content maintenance.

These needs should be addressed through templates, recipes, analyzer profiles, and starter packs rather than pathology-specific core architecture.

## 5. Positioning

Mnemonify is not:

- a presentation tool;
- a generic website builder;
- a learning management system;
- a student information system;
- a real-time classroom orchestration platform;
- an AI wrapper around course generation;
- a pathology-only authoring system;
- a marketplace before it is a reliable authoring tool.

Mnemonify is a general-purpose learning-engineering platform for structured, responsive, interactive, and maintainable learning.

A concise positioning statement:

> Mnemonify helps authors build learning that is aligned, active, measurable, accessible, and maintainable.

## 6. What users are actually trying to accomplish

Authors rarely begin with “I need an accordion.” They begin with an instructional intent:

- explain a concept;
- compare alternatives;
- demonstrate a process;
- ask the learner to predict;
- diagnose a misconception;
- present a case;
- collect a reflection;
- assess recall;
- branch based on a decision;
- require completion before continuing;
- help learners apply knowledge in a realistic context;
- verify that assessment matches the intended objective.

The authoring experience should increasingly organize itself around these intents rather than exposing only a catalog of components.

## 7. Product principles

### 7.1 Deterministic first

If a requirement can be implemented reliably with rules, schemas, validation, and explicit state, it should not depend on AI.

Deterministic systems should own:

- course validity;
- accessibility checks;
- dependency analysis;
- objective and assessment mapping;
- trigger behavior;
- scoring;
- publishing;
- migrations;
- resume data;
- quality rules;
- export behavior.

AI may assist with optional content-generation and interpretation tasks, but it must not be required for a course to work.

### 7.2 Opinionated authoring

Mnemonify should make good defaults easier than bad choices.

Opinionated does not mean inflexible. It means:

- layouts are responsive by construction;
- typography and spacing are governed by the design system;
- accessibility requirements are visible during authoring;
- common teaching patterns have guided recipes;
- unsupported combinations are prevented or explained;
- complexity is disclosed rather than hidden.

### 7.3 Pedagogy before feature accumulation

New block types should solve a recurring teaching problem. A long list of novelty interactions is less valuable than:

- clear objectives;
- relevant instruction;
- meaningful practice;
- useful feedback;
- spaced retrieval;
- scenario decisions;
- reflection;
- transfer and application;
- accessible media;
- maintainable course structure.

### 7.4 Progressive disclosure

The default experience should stay simple. Advanced controls appear when the author asks for them.

Example progression:

```text
Add a knowledge check
→ choose question and feedback
→ map it to an objective
→ optionally use score in a condition
→ optionally inspect generated triggers
```

### 7.5 Maintenance is part of authoring

A course is rarely finished forever. Authors need to revise, translate, replace assets, update policy, repair links, and publish new versions.

Mnemonify should treat maintenance as a first-class workflow through:

- dependency inspection;
- global replace;
- unused-content detection;
- version comparisons;
- safe deletion;
- course health checks;
- reusable patterns;
- update-aware linked content.

### 7.6 Accessibility is architecture

Accessibility should shape every block, recipe, export, and interaction before implementation. It is not a final compliance toggle.

### 7.7 Community without fragmentation

Community contributions should expand the product while preserving compatibility and trust. Extensions must follow shared contracts for:

- responsive behavior;
- accessibility;
- security;
- migrations;
- exports;
- analytics;
- documentation;
- tests.

Templates, recipes, analyzer profiles, and embed presets should be preferred over plugins whenever existing core capabilities can represent the experience.

## 8. Platform strategy

Mnemonify should use a three-layer product model.

### 8.1 General core

The core remains domain-neutral:

- blocks;
- pages and courses;
- responsive layouts;
- variables, states, triggers, and branching;
- objectives;
- assessments and feedback;
- mappings;
- embeds;
- publishing;
- accessibility;
- dependency analysis;
- Course Analyzer.

### 8.2 Instructional-design layer

Reusable domain-neutral capabilities include:

- instructional recipes;
- objective-content-practice-assessment mapping;
- assessment-quality rules;
- retrieval-practice guidance;
- scenario and decision patterns;
- feedback-quality analysis;
- transfer and application prompts;
- maintenance rules.

### 8.3 Starter packs and analyzer profiles

Domain and audience needs are addressed through editable resources:

- course templates;
- page templates;
- block patterns;
- predefined variables and triggers;
- question patterns;
- author guidance;
- analyzer profiles;
- sample content;
- embed presets.

Examples may include pathology cases, nursing scenarios, laboratory competency, K–12 lessons, faculty development, software onboarding, and compliance training.

Starter-pack content must produce ordinary Mnemonify course JSON and remain fully editable.

## 9. Opinionated authoring model

### 9.1 Intent-led entry points

Alongside “Add block,” Mnemonify should offer guided choices such as:

- Teach a concept
- Compare ideas
- Show a process
- Present a case
- Check understanding
- Practice a decision
- Invite reflection
- Provide a resource
- Prepare for transfer

Each launches a curated structure that remains editable as ordinary blocks.

### 9.2 Instructional recipes

Recipes are not locked templates. They are deterministic generators for proven structures.

Examples:

- Worked Example
- Predict–Observe–Explain
- Case–Decision–Feedback
- Compare and Contrast
- Error Diagnosis
- Guided Discovery
- Reflection and Commitment
- Retrieval Practice
- Branching Scenario
- Demonstration with Practice
- Microlearning Lesson
- Process Walkthrough

A recipe can create pages, blocks, variables, triggers, objectives, mappings, and feedback, but the result must remain normal course JSON.

### 9.3 Trigger recipes

Common logic should be expressed in author language:

- Unlock after reading
- Reveal after attempt
- Continue when video completes
- Retry until correct
- Show remediation below threshold
- Set a choice and branch later
- Require all items
- Display optional challenge
- Mark page complete after interaction

The system generates explicit triggers that advanced authors may inspect.

### 9.4 Starter packs

A starter pack is a curated collection of:

- course templates;
- page templates;
- instructional recipes;
- interaction patterns;
- trigger recipes;
- analyzer profiles;
- author instructions;
- sample courses;
- theme or presentation defaults.

Starter packs should reduce setup effort without introducing new runtime architecture.

For example, a pathology case pack might include:

- clinical-information page;
- external WSI embed;
- specimen-adequacy question;
- ancillary-study decision;
- progressive result reveal;
- diagnosis question;
- answer-level differential feedback;
- discussion and takeaway structure.

The same core capabilities could support nursing cases, technical troubleshooting, software simulations, compliance decisions, and K–12 inquiry activities.

## 10. Learning alignment model

Mnemonify should support explicit relationships among:

- goals or intended outcomes;
- learning objectives;
- content;
- examples and demonstrations;
- practice activities;
- assessment questions;
- feedback and remediation;
- transfer or application activities.

Authors should be able to create these mappings manually, through recipes, or while authoring content.

The system should provide:

- an objective coverage matrix;
- taught-versus-assessed comparison;
- content with no declared instructional purpose;
- objectives with no supporting content;
- objectives with no practice;
- objectives with no assessment;
- questions that assess unmapped content;
- excessive or insufficient assessment coverage;
- links from every finding to the relevant content.

A useful conceptual model is:

```text
Outcome
→ Objective
→ Instruction
→ Practice
→ Assessment
→ Feedback
→ Transfer
```

## 11. Course Analyzer as the primary product differentiator

The Course Analyzer should evaluate the course using transparent, versioned, deterministic rules.

It should not claim to determine whether learning will occur. It should identify evidence, omissions, inconsistencies, risks, and opportunities associated with sound instructional design, accessibility, assessment, logic, publishing, and maintenance.

### 11.1 Analysis categories

#### Structural integrity

- invalid or incomplete objects;
- orphaned blocks or pages;
- broken internal references;
- unreachable branches;
- unused variables;
- conflicting trigger behavior;
- missing required settings.

#### Learning alignment

- objective with no instruction;
- objective with no practice;
- objective with no assessment;
- content mapped to no objective;
- assessment mapped to no objective;
- assessment of content not taught;
- uneven objective coverage;
- mismatch between objective and assessment level.

#### Instructional design

- excessive passive content;
- long sequences without learner activity;
- insufficient retrieval practice;
- no meaningful application;
- no remediation;
- weak or absent feedback;
- scenario decisions without consequences;
- reflection without follow-through;
- missing transfer activity for performance-oriented objectives.

#### Assessment quality

- question without a defined objective;
- missing answer-level feedback;
- duplicate or overlapping options;
- answer-length cues;
- implausible distractors;
- inconsistent scoring;
- single-select configured where several answers are acceptable;
- assessment type inconsistent with the intended performance;
- excessive reliance on recall questions.

#### Accessibility and usability

- missing alternatives;
- inaccessible interaction patterns;
- keyboard and focus issues;
- contrast problems;
- caption or transcript omissions;
- mobile overflow;
- excessive content density;
- inaccessible embedded content without fallback guidance.

#### Maintenance and governance

- broken links or embeds;
- unused assets;
- duplicated content;
- inconsistent terminology;
- stale review dates;
- unresolved findings;
- content changed after approval;
- objects with high dependency impact;
- differences from the last published version.

#### Publishing quality

- oversized media;
- unsupported assets;
- export incompatibilities;
- missing package metadata;
- runtime logic unavailable in the selected export;
- hidden content exposed in printable or fallback outputs.

### 11.2 Finding model

Every finding should include:

- severity;
- confidence;
- rule identifier and version;
- affected object;
- evidence;
- why it matters;
- recommended action;
- whether it can be automatically repaired;
- whether human judgment is required;
- direct navigation to the issue.

Findings should distinguish:

- verified errors;
- likely risks;
- instructional suggestions;
- informational observations.

### 11.3 Analyzer profiles

Authors should be able to select or combine profiles such as:

- general course quality;
- accessibility;
- assessment quality;
- objective alignment;
- scenario-based learning;
- retrieval practice;
- microlearning;
- competency-based education;
- professional continuing education;
- institution-specific standards.

Domain starter packs may add optional rules without changing the core analyzer model.

### 11.4 Analyzer design principles

The Analyzer should support author judgment rather than impose one instructional methodology.

Rules should:

- explain their instructional basis;
- identify when a recommendation is contextual;
- allow justified suppression;
- avoid treating interaction frequency as a proxy for learning quality;
- avoid rewarding novelty or superficial engagement;
- distinguish formative, summative, reference, and performance-support content;
- allow authors to declare intentional exceptions;
- never present heuristic findings as proven defects.

## 12. Maintenance-first capabilities

### Dependency Inspector

Shows where a page, block, variable, asset, objective, assessment, mapping, embed, or reusable object is referenced.

### Course complexity indicator

Uses transparent measures such as trigger count, variable count, branch depth, unresolved findings, mapping density, and cross-page references.

### Explain this course

Generates deterministic documentation:

- course outline;
- objective inventory;
- objective-content-practice-assessment matrix;
- assessment blueprint;
- feedback and remediation map;
- transfer and application inventory;
- variable dictionary;
- trigger inventory;
- branch summary;
- asset and license report;
- embed inventory;
- accessibility status;
- Analyzer findings and suppressions;
- change history.

### Change impact

Before deleting or replacing an object, show affected pages, triggers, mappings, translations, findings, and exports.

### Publish comparison

Summarize what changed since the last published version, including instructional relationships and unresolved findings.

## 13. External learning-tool integration

Mnemonify should integrate with specialist platforms rather than reproduce capabilities they already perform well.

The embed system should support:

- responsive sizing;
- provider presets;
- fallback links;
- authentication guidance;
- domain allowlists;
- security configuration;
- availability checks;
- accessibility declarations;
- completion or interaction messaging when supported;
- clear behavior in SCORM and standalone exports.

Provider-specific presets may be created for commonly used services without making those services part of the core data model.

## 14. Structured import and migration

Mnemonify should reduce the cost of moving from existing storyboards, documents, and legacy course formats.

Initial opportunities include:

- importing structured Word storyboards;
- recognizing common headings and tables;
- mapping images and filenames;
- pairing questions with answers and feedback;
- identifying unresolved or ambiguous fields;
- producing an import-confidence report;
- preserving source-document references;
- exporting a review-friendly storyboard from structured course data.

Domain starter packs may provide import mappings for commonly used templates, but the import architecture should remain general.

## 15. Starter content and community model

The long-term starter library should prioritize instructional utility over visual decoration.

Useful contributions include:

- lesson recipes;
- accessible interaction patterns;
- domain starter packs and templates;
- assessment patterns;
- analyzer profiles and rule packs;
- embed-provider presets;
- public-domain and openly licensed media;
- themes within approved constraints;
- translation packs;
- sample courses;
- deployment integrations.

Every contribution should expose license, provenance, compatibility, accessibility status, and maintenance ownership.

## 16. Optional AI layer

AI is an enhancement, not the operating model.

Appropriate optional uses:

- suggest learning objectives from supplied content;
- draft knowledge checks;
- generate distractor alternatives;
- summarize long source material;
- suggest plain-language revisions;
- propose alt text for author review;
- draft translations;
- recommend a recipe;
- explain an Analyzer finding;
- propose mappings for author review;
- identify possible contradictions for human review.

Inappropriate core dependencies:

- deciding whether a course is valid;
- executing triggers;
- calculating scores;
- migrating course data;
- publishing;
- enforcing accessibility;
- resolving references;
- storing learner completion;
- generating required runtime code.

Provider choice should be replaceable. Self-hosted and no-AI deployments must retain the complete core product.

## 17. Opportunity priorities

### Near-term differentiators

1. Objective, content, practice, and assessment mapping
2. Expanded deterministic Course Analyzer
3. Actionable Course Health interface
4. Instructional recipes
5. Course and page templates
6. Answer-level feedback
7. Dependency and change-impact tools
8. Reliable responsive embeds
9. Explain This Course documentation
10. One sophisticated starter pack, initially pathology or professional education

### Validation-stage opportunities

1. Structured Word storyboard import
2. Analyzer profiles
3. Assessment blueprinting
4. Template and recipe sharing
5. Publish comparisons
6. Review-friendly reports
7. Organization-level standards and rules

### Later opportunities

1. Optional domain rule packs
2. Round-trip document review
3. Psychometric data ingestion
4. Collaboration and approval workflows
5. Community marketplace
6. Optional AI assistance
7. Learning-outcome and transfer analytics

## 18. Long-term experience

A mature Mnemonify authoring flow could look like this:

1. The author selects an instructional intent, template, or starter pack.
2. The author defines or selects intended objectives.
3. Mnemonify generates an editable responsive structure.
4. Content, practice, assessment, and feedback are mapped as the author works.
5. Plain-language recipes create common interaction logic.
6. Course Health identifies technical, accessibility, alignment, assessment, and maintenance issues.
7. The author reviews recommendations and records intentional exceptions.
8. Explain This Course documents the design and dependencies.
9. Publishing creates a validated, versioned output.
10. The course remains portable, inspectable, reusable, and maintainable.

## 19. Success criteria

Mnemonify succeeds when:

- first-time authors publish useful work quickly;
- courses remain usable on phones without manual redesign;
- advanced logic is possible without scripting;
- authors can understand why a course behaves as it does;
- authors can see which objectives are taught, practiced, and assessed;
- courses contain fewer unmapped or unsupported learning elements;
- feedback explains reasoning rather than only correctness;
- performance-oriented objectives include relevant application;
- authors can identify missing practice or transfer opportunities;
- recommendations remain transparent and dismissible;
- sophisticated domain experiences can be created through templates rather than custom development;
- starter packs accelerate work without fragmenting the platform;
- Analyzer reports are credible to experienced instructional designers;
- users can produce better-structured learning without depending on AI;
- old courses continue opening after upgrades;
- community extensions do not compromise accessibility or security;
- self-hosted users retain full core functionality;
- maintenance takes less effort than rebuilding;
- educators trust the defaults.

## 20. Strategic restraint

The product should resist requests that undermine its identity:

- free-form pixel layout;
- arbitrary JavaScript;
- unlimited design-system overrides;
- features that turn it into an LMS;
- AI-only workflows;
- opaque adaptive behavior;
- pathology-specific core architecture when templates and rules are sufficient;
- custom media infrastructure where specialist platforms already solve the problem;
- marketplace growth before compatibility and trust exist;
- complexity introduced solely to match competitors.

Mnemonify’s advantage is not having the most controls. It is making meaningful interactive learning creation understandable, aligned, responsive, maintainable, and open.
