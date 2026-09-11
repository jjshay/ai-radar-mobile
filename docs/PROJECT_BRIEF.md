# AI Pulse Mobile — Project Brief

## At a glance

| Field | Value |
|---|---|
| Portfolio area | Content operations |
| Repository | [jjshay/ai-radar-mobile](https://github.com/jjshay/ai-radar-mobile) |
| Status | Source available; runtime not revalidated in this documentation review |
| Evidence review | 2026-09-11; [commit d0f1016](https://github.com/jjshay/ai-radar-mobile/tree/d0f1016e642f50099f2ac719e1f8e24a6f02c95e) |

## Problem and intended value

Mobile content discovery needs integrated listening, follow-up questions, and presentation creation.

The intended value is a repeatable workflow whose inputs, transformations, and outputs can be inspected. Use the evidence below to distinguish implementation from business outcomes.

## Architecture and data flow

News cards → selection → API adapters for text, voice, and slides → publishing integration.

```mermaid
flowchart LR
    N0["News cards"]
    N1["selection"]
    N2["API adapters for text, voice, and slides"]
    N3["publishing integration"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
```

## Implementation evidence

| Source | Reading purpose |
|---|---|
| [api/generate-slides.js](../api/generate-slides.js) | Implementation component supporting the data flow described above. |
| [api/linkedin-post.js](../api/linkedin-post.js) | Implementation component supporting the data flow described above. |
| [backend/server.py](../backend/server.py) | Application entry point, interface, or integration boundary. |

The links above point to the current repository. The review reference identifies the version used to prepare this brief.

## Setup and operation

Use the existing [README](../README.md) for setup and operating commands. Configuration and dependency references: [package.json](../package.json).

Start with sample or fixture inputs. Where external services are involved, configure a test account and check the distinction between a local preview, a generated artifact, and a remote write. Credentials and operational datasets are environment-specific.

## Validation and outcomes

**Review result:** Repository tree and referenced source reviewed. Existing application tests, hosted deployments, paid providers, and external mutations were not re-run in this documentation review.

No conventional test suite was identified in the reviewed repository tree; validation should begin with the next improvement below.

The source implements the workflow described above. No new revenue, accuracy, conversion, or production-uptime result is asserted by this documentation update.

Documentation itself is checked by `python3 scripts/check_project_docs.py`; that check validates this structure and its source references, not application behavior.

## Decisions and limitations

A broad set of integrations increases capability and operational failure modes; each adapter needs explicit configuration and error states.

Keep provider-dependent observations dated and separate from deterministic transformations. State which assumptions a demonstration uses and which integrations it actually exercises.

## Interview talking points

- **Problem and product judgment:** Explain why this workflow mattered to its intended operator: Mobile content discovery needs integrated listening, follow-up questions, and presentation creation.
- **Technical walkthrough:** Trace one concrete input through this sequence: News cards → selection → API adapters for text, voice, and slides → publishing integration.
- **Engineering tradeoff:** A broad set of integrations increases capability and operational failure modes; each adapter needs explicit configuration and error states.
- **Evidence and ownership:** Open the source links above, identify the specific design or implementation decisions you personally drove, and distinguish AI-assisted implementation from measured operating results.
- **What comes next:** Create a sandbox walkthrough for discovery, generation, and approval without posting to a live account.

## Next improvements

Create a sandbox walkthrough for discovery, generation, and approval without posting to a live account.

Record any follow-up result with a date, exact command or evaluation method, input scope, observed output, and limitations. Update `project.json` alongside this brief.

## Related projects

- [AI Radar Services](https://github.com/jjshay/ai-radar-backend) — Content operations.
- [AI Radar Discovery](https://github.com/jjshay/ai-radar-demo) — Content operations.
- [Art Catalog Automation](https://github.com/jjshay/art-catalog-automation) — Content operations.
- [Editorial Publishing Engine](https://github.com/jjshay/gauntlet-blog-engine) — Content operations.
- [Shopify Content Automation](https://github.com/jjshay/gauntlet-shopify-seed) — Content operations.

Some related repositories require authorized GitHub access.
