# Company and information pages

Implemented routes: `/about`, `/contact`, `/terms`, `/privacy`.

## Visual direction

Reuse the homepage palette, Manrope type, fixed phone compositions and real app captures. About follows listening, understanding, designing and simplifying with a site photo, workflow tags and a Hornbook-to-product diagram. Contact links a feature selector to an app preview. Legal pages use a visual summary, contents navigation and readable full-width paragraphs within a constrained reading column. No internal phone scrolling or new animation dependencies.

## Content and release boundaries

- About page hierarchy revised: introduce Hornbook and its software/consulting work first, explain the consulting/design/engineering fit for NirmanSite second, then a brief two-paragraph product origin. Removed the four-step story grid and illustrative conversation quotes to keep the page concise.

- Hornbook background is based on https://www.hornbooktechnologies.com/ and the product story supplied by the user. Omit the experience figure until the website's 10+ and user's 15-year figures are reconciled.
- Terms and privacy are visible review drafts with noindex metadata. They are not approved legal notices. Confirm legal entity, applicable law, dispute terms, liability provisions, retention, hosting, providers and privacy contact before launch.
- Do not claim payment processing, independent certification of customer entries, absolute security or immunity from lawful disclosures.
- Contact currently prepares an email to the publicly listed company contact. Nothing is automatically submitted or saved by the form. A separate send action in the visitor's email client is required, and the interface says so explicitly.
- Production lead capture remains a follow-up: configure an authorised delivery service, implement server validation, anti-abuse protection and consent handling, then replace the email handoff with truthful delivered/error states. Do not show a received confirmation without confirmed delivery.
- Header and footer link to the new pages.

## Validation status

User explicitly requested no verification and no app execution. No tests, build, browser or app run performed for this change.
