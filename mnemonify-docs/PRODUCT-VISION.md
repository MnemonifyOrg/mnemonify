# Product Vision

**Product:** Mnemonify  
**Tagline:** Learning creation for everyone.  
**Values:** Open, Simple, Flexible, Community

## 1. Purpose

Mnemonify is a general learning-engineering platform, not only a course-construction tool. It should help authors connect intended outcomes, objectives, instruction, practice, assessment, feedback, and transfer, then inspect those relationships through transparent deterministic analysis.

Mnemonify exists to make capable digital learning creation accessible to educators, solo instructional designers, nonprofits, community colleges, and small teams that cannot justify enterprise authoring-tool costs or complexity.

The product should occupy the space between two common extremes:

- simple page-based tools that are fast to learn but limited in interactivity;
- powerful slide-based tools that support logic but require specialist skills and often produce fragile responsive experiences.

Mnemonify combines:

- document-like, block-based authoring;
- enforced responsive behavior;
- variables, triggers, conditions, states, and branching;
- accessible learner experiences;
- open formats and self-hosting;
- SCORM and standalone publishing;
- a low-friction learning curve for non-developers.

## 2. Product promise

A first-time educator should be able to create and publish a credible responsive course with meaningful interaction in one sitting, without code, installation, or formal authoring-tool training.

Advanced capability should appear progressively. Users should not need to understand the internal data model or trigger engine to complete common teaching tasks.

## 3. Target audience

### Primary: solo educator

Needs:

- immediate browser access;
- a guided starting point;
- reliable design defaults;
- simple media and assessment workflows;
- no code;
- affordable or free delivery.

### Secondary: small instructional-design or L&D team

Needs:

- shared courses and assets;
- repeatable templates;
- review and approval;
- SCORM publishing;
- version history;
- maintainable interaction logic.

### Tertiary: self-hosting institution

Needs:

- documented deployment;
- transparent data ownership;
- maintainable upgrades;
- security controls;
- open-source licensing;
- extension points.

### Professional education and advanced validation audience

Professional education teams, certification programs, healthcare educators, and experienced instructional designers provide an important validation audience for Mnemonify's advanced capabilities. They commonly need case-based learning, detailed feedback, progressive disclosure, rigorous review, and long-term maintenance.

Pathology and medical education are a flagship proving ground and starter-pack opportunity, not a constraint on the core architecture.

## 4. Positioning

Mnemonify is not:

- a presentation tool;
- a generic website builder;
- a learning management system;
- a student information system;
- a real-time classroom orchestration platform;
- an AI wrapper around course generation;
- a marketplace before it is a reliable authoring tool.

Mnemonify is an authoring system for structured, responsive, interactive learning.

## 5. What users are actually trying to accomplish

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
- require completion before continuing.

The authoring experience should increasingly organize itself around these intents rather than exposing only a catalog of components.

## 6. Product principles

### 6.1 Deterministic first

If a requirement can be implemented reliably with rules, schemas, validation, and explicit state, it should not depend on AI.

Deterministic systems should own:

- course validity;
- accessibility checks;
- dependency analysis;
- trigger behavior;
- scoring;
- publishing;
- migrations;
- resume data;
- quality rules;
- export behavior.

AI may assist with optional content-generation tasks, but it must not be required for a course to work.

### 6.2 Opinionated authoring

Mnemonify should make good defaults easier than bad choices.

Opinionated does not mean inflexible. It means:

- layouts are responsive by construction;
- typography and spacing are governed by the design system;
- accessibility requirements are visible during authoring;
- common teaching patterns have guided recipes;
- unsupported combinations are prevented or explained;
- complexity is disclosed rather than hidden.

### 6.3 Pedagogy before feature accumulation

New block types should solve a recurring teaching problem. A long list of novelty interactions is less valuable than:

- clear objectives;
- relevant practice;
- useful feedback;
- spaced retrieval;
- scenario decisions;
- reflection;
- accessible media;
- maintainable course structure.

### 6.4 Progressive disclosure

The default experience should stay simple. Advanced controls appear when the author asks for them.

Example progression:

```text
Add a knowledge check
→ choose question and feedback
→ optionally use score in a condition
→ optionally inspect generated triggers
```

### 6.5 Maintenance is part of authoring

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

### 6.6 Accessibility is architecture

Accessibility should shape every block, recipe, export, and interaction before implementation. It is not a final compliance toggle.

### 6.7 Community without fragmentation

Community contributions should expand the product while preserving compatibility and trust. Extensions must follow shared contracts for:

- responsive behavior;
- accessibility;
- security;
- migrations;
- exports;
- analytics;
- documentation;
- tests.

## 7. Opinionated authoring model

### 7.1 Intent-led entry points

Alongside “Add block,” Mnemonify should offer guided choices such as:

- Teach a concept
- Compare ideas
- Show a process
- Present a case
- Check understanding
- Practice a decision
- Invite reflection
- Provide a resource

Each launches a curated structure that remains editable as ordinary blocks.

### 7.2 Instructional recipes

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

A recipe can create pages, blocks, variables, and triggers, but the result must remain normal course JSON.

### 7.3 Trigger recipes

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

## 7.4 Learning-alignment model

Mnemonify should make the following relationships explicit and inspectable:

```text
Outcome
  -> Objective
      -> Instruction
      -> Practice
      -> Assessment
      -> Feedback and remediation
      -> Transfer or application
```

Authors may create mappings directly, through templates, or through instructional recipes. The system should expose gaps without claiming that structural alignment alone proves learning effectiveness.

## 8. Course Analyzer as a product differentiator

The Course Analyzer continuously evaluates the course using deterministic rules. It should answer:

- Is the course valid?
- Is anything broken?
- Is the experience accessible?
- Is the logic understandable?
- Is the course maintainable?
- Is the mobile experience likely to work?
- Is the published package unnecessarily large?
- Are important instructional elements missing?

Findings should be actionable, explain why they matter, and navigate directly to the affected object.

The Analyzer must distinguish:

- errors that block publishing;
- warnings that indicate likely defects;
- suggestions that improve quality;
- informational observations.

## 9. Maintenance-first capabilities

Priority opportunities:

### Dependency Inspector

Shows where a page, block, variable, asset, objective, or reusable object is referenced.

### Course complexity indicator

Uses transparent measures such as trigger count, variable count, branch depth, unresolved findings, and cross-page references.

### Explain this course

Generates deterministic documentation:

- course outline;
- objective map;
- variable dictionary;
- trigger inventory;
- branch summary;
- assessment map;
- asset and license report;
- accessibility status.

### Change impact

Before deleting or replacing an object, show affected pages, triggers, translations, and exports.

### Publish comparison

Summarize what changed since the last published version.

## 10. Starter content and community model

### 10.1 Three-layer platform model

Mnemonify should separate:

1. **General core:** blocks, responsive layouts, variables, states, triggers, objectives, assessments, embeds, publishing, and the Analyzer engine.
2. **Instructional-design layer:** learning mappings, recipes, assessment guidance, retrieval and scenario patterns, feedback analysis, and transfer prompts.
3. **Starter packs:** editable templates, predefined logic, Analyzer profiles, embed presets, import mappings, author guidance, and sample content for particular contexts.

Starter packs must instantiate ordinary canonical course JSON. A course must remain editable and playable without the originating pack.

The long-term starter library should prioritize instructional utility over visual decoration.

Useful contributions include:

- lesson recipes;
- accessible interaction patterns;
- discipline-specific blocks;
- assessment patterns;
- public-domain and openly licensed media;
- themes within approved constraints;
- Course Analyzer rules;
- translation packs;
- sample courses;
- deployment integrations.

Every contribution should expose license, provenance, compatibility, accessibility status, and maintenance ownership.

## 11. Optional AI layer

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
- explain an Analyzer finding.

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

## 12. Long-term experience

A mature Mnemonify authoring flow could look like this:

1. The author chooses a teaching intent or starter recipe.
2. Mnemonify creates a clear, responsive structure.
3. The author edits directly in the page.
4. Advanced behaviors are added through plain-language recipes.
5. Course Health identifies broken, inaccessible, or weak areas.
6. Dependency tools make revision safe.
7. Preview reproduces learner state and explains logic.
8. Publishing creates a versioned, validated output.
9. The course remains portable, inspectable, and maintainable.

## 13. Success criteria

Mnemonify succeeds when:

- first-time authors publish useful work quickly;
- courses remain usable on phones without manual redesign;
- advanced logic is possible without scripting;
- authors can understand why a course behaves as it does;
- old courses continue opening after upgrades;
- community extensions do not compromise accessibility or security;
- self-hosted users retain full core functionality;
- maintenance takes less effort than rebuilding;
- educators trust the defaults.

## 14. Strategic restraint

The product should resist requests that undermine its identity:

- free-form pixel layout;
- arbitrary JavaScript;
- unlimited design-system overrides;
- features that turn it into an LMS;
- AI-only workflows;
- opaque adaptive behavior;
- marketplace growth before compatibility and trust exist;
- complexity introduced solely to match competitors.

Mnemonify’s advantage is not having the most controls. It is making meaningful interactive learning creation understandable, responsive, maintainable, and open.
