/**
 * Correr legal copy.
 *
 * This is the single source of truth for the in-app Terms, Privacy Policy and
 * AI Disclosure. Keep the version in step with `CONSENT_VERSION` in
 * `src/core/domain.ts` whenever a change requires fresh consent.
 *
 * The operator details below are intentionally generic where the legal entity
 * has not yet been incorporated. Counsel should confirm the registered entity,
 * address, governing law and any required regional representative before
 * launch.
 */

export type LegalBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'callout'; title: string; text: string };

export interface LegalSection {
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  id: 'terms' | 'privacy' | 'ai';
  title: string;
  shortTitle: string;
  summary: string;
  sections: LegalSection[];
}

export const LEGAL_VERSION = '2026-10-27';
export const LEGAL_UPDATED = '27 October 2026';
export const LEGAL_ENTITY = 'Correr';
export const SUPPORT_EMAIL = 'support@correr.app';
export const PRIVACY_EMAIL = 'privacy@correr.app';
export const LEGAL_EMAIL = 'legal@correr.app';

export const TERMS_DOCUMENT: LegalDocument = {
  id: 'terms',
  title: 'Terms of Service',
  shortTitle: 'Terms',
  summary:
    'The agreement between you and Correr, including account rules, AI limits, payments, liability and dispute resolution.',
  sections: [
    {
      id: 'agreement',
      heading: '1. The agreement',
      blocks: [
        {
          kind: 'paragraph',
          text: `These Terms of Service (the “Terms”) are a legal agreement between you and ${LEGAL_ENTITY} (“Correr”, “we”, “us” or “our”). They govern your access to and use of the Correr mobile app, website, and related services (together, the “Service”).`,
        },
        {
          kind: 'paragraph',
          text: `By creating an account, downloading the app, or using the Service, you agree to these Terms, our Privacy Policy, and our AI Disclosure. Those documents are incorporated into these Terms by reference. If you do not agree, do not create an account and do not use the Service.`,
        },
        {
          kind: 'callout',
          title: 'Plain summary',
          text: 'Use Correr lawfully, keep your account secure, do not rely on AI output as professional advice, and read the limits in sections 9 and 10 before using the Service.',
        },
      ],
    },
    {
      id: 'eligibility',
      heading: '2. Eligibility and your account',
      blocks: [
        {
          kind: 'paragraph',
          text: `You must be at least 18 years old, or the age of legal majority in your jurisdiction, to create an account. If local law permits a minor to use the Service with parental consent, the parent or guardian must agree to these Terms on the minor’s behalf and supervise the account. We may suspend or close any account we reasonably believe belongs to a person below the permitted age.`,
        },
        {
          kind: 'bullets',
          items: [
            'Provide accurate account information and keep it up to date.',
            'Keep your password, device and sign-in credentials secure. Do not share your account.',
            'Tell us promptly at support@correr.app if you believe your account has been compromised.',
            'You are responsible for activity that happens through your account, except to the extent caused by our failure to use reasonable care.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'We may refuse, suspend or close an account where we reasonably believe these Terms have been breached, where required by law, or where necessary to protect the Service, other users or the public.',
        },
      ],
    },
    {
      id: 'licence',
      heading: '3. Your licence to use Correr',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Subject to these Terms, we grant you a personal, limited, non-exclusive, non-transferable, revocable licence to download and use the Service for your own non-commercial purposes. The Service is licensed, not sold. We and our licensors retain all rights in the Service, including the Correr name, logo, design, software and content we provide.',
        },
        {
          kind: 'paragraph',
          text: 'You may not copy, modify, distribute, sell, sublicense, reverse engineer, decompile, scrape, frame, or attempt to extract the source code of the Service, except where a restriction is prohibited by law. You may not use automated tools to access the Service in a way that imposes an unreasonable load on our systems.',
        },
      ],
    },
    {
      id: 'acceptable-use',
      heading: '4. Acceptable use',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You are responsible for how you use the Service and for the content you submit. You must not use the Service to:',
        },
        {
          kind: 'bullets',
          items: [
            'Break any law, regulation, court order or third-party right.',
            'Harass, threaten, defame, deceive, impersonate or discriminate against anyone.',
            'Upload malware, attempt to gain unauthorised access, probe our security, or interfere with the Service.',
            'Scrape, harvest or collect other users’ information without permission.',
            'Send spam, chain messages, or unsolicited commercial content.',
            'Upload content that exploits or harms minors, or that depicts sexual violence or non-consensual intimate imagery.',
            'Use the Service for high-risk decisions where an error could cause death, personal injury, financial loss or significant legal harm.',
            'Use AI features to provide medical, legal, financial, mental-health or other professional advice to another person.',
            'Upload another person’s sensitive personal data, trade secrets or confidential information without authority.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'We may remove content, limit features, or suspend an account where we reasonably believe this section has been breached. We are not obliged to monitor every message, but we may review content where necessary for safety, security, legal compliance or support.',
        },
      ],
    },
    {
      id: 'your-content',
      heading: '5. Your content',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You keep ownership of the text, goals, visions, commitments, check-ins, messages and other content you submit to the Service (“Your Content”). You grant us a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, process, transmit and display Your Content only as needed to operate, secure, support and improve the Service, and to comply with law.',
        },
        {
          kind: 'paragraph',
          text: 'You represent that you have the rights needed to submit Your Content and that doing so does not violate anyone else’s rights. We do not use Your Content to train public AI models. We may use aggregated or de-identified information that cannot reasonably identify you to understand product usage and improve the Service.',
        },
        {
          kind: 'paragraph',
          text: 'If you share content with an accountability partner, circle or team, those people may see and use it. Think carefully before sharing sensitive information. You can delete Your Content in the app, subject to backup and legal-retention periods described in the Privacy Policy.',
        },
      ],
    },
    {
      id: 'ai',
      heading: '6. AI features',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Correr uses third-party artificial intelligence to generate coaching replies, roadmaps, summaries and plan adjustments. AI output is probabilistic. It can be wrong, incomplete, biased, offensive, outdated or unsafe. It is not a human professional and it does not have your full context.',
        },
        {
          kind: 'paragraph',
          text: 'You are responsible for reviewing AI output before relying on it. Do not use Correr for medical, legal, financial, mental-health, emergency or other professional advice. If you are in danger or need urgent help, contact local emergency services. Our AI Disclosure explains how AI works and how to report a problem.',
        },
        {
          kind: 'paragraph',
          text: 'We may change models, providers, prompts and safety measures. We may limit AI features to manage cost, abuse, security or legal risk. We do not guarantee that any AI feature will be available, accurate, uninterrupted or free from harmful output.',
        },
      ],
    },
    {
      id: 'plans',
      heading: '7. Plans, payments and renewals',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Some features may require a paid subscription. The price, billing period, renewal terms, taxes and cancellation method will be shown before you purchase. If you buy through Apple, Google or another app store, that store’s payment and refund terms also apply.',
        },
        {
          kind: 'bullets',
          items: [
            'Subscriptions renew automatically unless cancelled before the renewal date.',
            'You can manage or cancel a store subscription in your app-store account settings.',
            'Deleting the Correr app does not cancel a subscription.',
            'We may change prices with notice where required by law. Changes apply to the next billing period after the notice period.',
            'Refunds are governed by the store or payment provider that processed the purchase, and by any non-waivable consumer rights.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'The current build uses demo billing. No real charge is made until live payments are enabled. When live billing is enabled, the purchase screen will identify the seller and the applicable terms.',
        },
      ],
    },
    {
      id: 'availability',
      heading: '8. Availability, changes and termination',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We work to keep Correr available, but we do not promise uninterrupted service. The Service may be unavailable during maintenance, upgrades, network failures, provider outages or events outside our reasonable control. We may add, change or remove features.',
        },
        {
          kind: 'paragraph',
          text: 'You may stop using the Service at any time and delete your account from Account > Delete account. We may suspend or terminate your access if you breach these Terms, if we are required to do so by law, or if continuing would create a security, legal or safety risk.',
        },
        {
          kind: 'paragraph',
          text: 'On termination, your licence ends. Sections that by their nature should survive will survive, including sections on your content, disclaimers, limitation of liability, indemnity, dispute resolution and contact.',
        },
      ],
    },
    {
      id: 'disclaimers',
      heading: '9. Disclaimers',
      blocks: [
        {
          kind: 'paragraph',
          text: 'To the maximum extent permitted by law, the Service is provided “as is” and “as available”. We disclaim all express and implied warranties, including warranties of merchantability, fitness for a particular purpose, title, non-infringement, accuracy, security and uninterrupted availability.',
        },
        {
          kind: 'paragraph',
          text: 'We do not warrant that the Service will help you achieve any goal, that AI output will be accurate or appropriate, or that data will never be lost. You use the Service at your own risk. Some jurisdictions do not allow certain warranty exclusions, so some of the above may not apply to you.',
        },
        {
          kind: 'callout',
          title: 'Not professional advice',
          text: 'Correr is a planning and coaching tool. It is not a doctor, lawyer, financial adviser, therapist, employer or emergency service. Always get qualified professional advice for important decisions.',
        },
      ],
    },
    {
      id: 'liability',
      heading: '10. Limitation of liability',
      blocks: [
        {
          kind: 'paragraph',
          text: 'To the maximum extent permitted by law, Correr and its directors, officers, employees, contractors, partners and suppliers will not be liable for indirect, incidental, special, consequential, exemplary or punitive damages, or for loss of profits, revenue, goodwill, opportunity, data or business interruption, even if we were advised of the possibility.',
        },
        {
          kind: 'paragraph',
          text: 'Our total aggregate liability for all claims relating to the Service in any 12-month period will not exceed the greater of (a) the amount you paid us for the Service in the 12 months before the event giving rise to the claim, or (b) USD 100. This cap applies however the claim arises, whether in contract, tort, negligence, statute or otherwise.',
        },
        {
          kind: 'paragraph',
          text: 'Nothing in these Terms excludes or limits liability that cannot lawfully be excluded, including liability for fraud, wilful misconduct, gross negligence, death or personal injury caused by our negligence, or any non-waivable consumer right.',
        },
      ],
    },
    {
      id: 'indemnity',
      heading: '11. Indemnity',
      blocks: [
        {
          kind: 'paragraph',
          text: 'To the extent permitted by law, you agree to defend, indemnify and hold harmless Correr and its directors, officers, employees and contractors from claims, losses, liabilities, damages, costs and reasonable legal fees arising from: (a) Your Content; (b) your breach of these Terms; (c) your misuse of the Service; or (d) your violation of law or another person’s rights.',
        },
        {
          kind: 'paragraph',
          text: 'We will notify you of a covered claim and may ask to participate in or control the defence where appropriate. You must cooperate reasonably. This section does not apply to the extent a claim is caused by our own negligence, wilful misconduct or breach of these Terms.',
        },
      ],
    },
    {
      id: 'disputes',
      heading: '12. Governing law and disputes',
      blocks: [
        {
          kind: 'paragraph',
          text: 'These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict-of-law rules. Subject to the paragraph below, the courts of Lagos State, Nigeria have exclusive jurisdiction over disputes arising from these Terms or the Service.',
        },
        {
          kind: 'paragraph',
          text: 'Before filing a claim, you and Correr agree to try in good faith to resolve the dispute by written notice to legal@correr.app and a 30-day discussion period. This does not prevent either party from seeking urgent injunctive relief or from contacting a regulator. If you are a consumer in the EU, UK or another country with mandatory consumer protections, you may also bring proceedings in your local courts and rely on those protections.',
        },
        {
          kind: 'paragraph',
          text: 'If any part of these Terms is found unenforceable, the remaining parts will continue in effect. A failure to enforce a provision is not a waiver. You may not assign these Terms without our written consent; we may assign them as part of a merger, acquisition, reorganisation or sale of assets.',
        },
      ],
    },
    {
      id: 'app-stores',
      heading: '13. Apple and Google app-store terms',
      blocks: [
        {
          kind: 'paragraph',
          text: 'If you download Correr from the Apple App Store, you acknowledge that these Terms are between you and Correr, not Apple. Apple is not responsible for the Service, maintenance, support or any claims relating to it. Apple’s Standard End User License Agreement also applies to the extent required. Apple is a third-party beneficiary of these Terms and may enforce them.',
        },
        {
          kind: 'paragraph',
          text: 'If you download Correr from Google Play, you acknowledge that Google is not a party to these Terms and has no responsibility for the Service. Google Play’s terms and policies also apply to your download and in-app purchases.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '14. Changes to these Terms',
      blocks: [
        {
          kind: 'paragraph',
          text: `We may update these Terms to reflect changes in the Service, law, security or business practices. The version and date at the top of this document show when it changed. If a change is material, we will give reasonable notice in the app or by email before it takes effect. If you do not agree, stop using the Service and delete your account. Continued use after the effective date means you accept the updated Terms.`,
        },
      ],
    },
    {
      id: 'contact',
      heading: '15. Contact',
      blocks: [
        {
          kind: 'paragraph',
          text: `Questions about these Terms: ${LEGAL_EMAIL}. General support: ${SUPPORT_EMAIL}. Privacy requests: ${PRIVACY_EMAIL}. We aim to respond within a reasonable time and within any period required by law.`,
        },
      ],
    },
  ],
};

export const PRIVACY_DOCUMENT: LegalDocument = {
  id: 'privacy',
  title: 'Privacy Policy',
  shortTitle: 'Privacy',
  summary:
    'What Correr collects, why we collect it, who we share it with, how long we keep it, and the rights you can exercise.',
  sections: [
    {
      id: 'scope',
      heading: '1. Scope and who controls your data',
      blocks: [
        {
          kind: 'paragraph',
          text: `This Privacy Policy explains how ${LEGAL_ENTITY} (“Correr”, “we”, “us” or “our”) collects, uses, shares and protects personal data when you use the Correr app, website and related services (the “Service”). It applies to account holders, visitors and people who contact support.`,
        },
        {
          kind: 'paragraph',
          text: `Correr is the data controller for personal data processed through the Service. Our privacy contact is ${PRIVACY_EMAIL}. Where required by law, we will appoint a Data Protection Officer or a local representative and publish their contact details here.`,
        },
      ],
    },
    {
      id: 'data-we-collect',
      heading: '2. Personal data we collect',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We collect the following categories of personal data:',
        },
        {
          kind: 'bullets',
          items: [
            'Account data: name, email address, password hash, sign-in provider identifier, consent version and consent timestamp.',
            'Profile data: display name, bio, focus areas, coaching tone, reply length, coach context, level, XP and preferences.',
            'Planning data: visions, roadmaps, commitments, goals, due dates, blockers, constraints, check-ins, streaks, weekly reviews and progress.',
            'Social data: accountability partner connections, circle membership, team membership and messages you choose to share.',
            'Coach data: conversations with the AI coach, messages, prompts and generated replies.',
            'Usage data: app events, feature usage, device type, operating system, app version, language, IP address, crash logs and approximate region.',
            'Support data: messages you send to support, including attachments you choose to provide.',
            'Payment data: if paid plans are enabled, subscription status, plan, renewal date and the last four digits of a payment card. Full card details are handled by the payment processor, not stored by us.',
            'Local data: theme, onboarding progress, default tab, notification preferences and sign-in session stored on your device.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'We do not intentionally collect precise location, biometric data, health records, government identifiers, or the personal data of children. Please do not submit these categories through the Service. If you include sensitive data in free text, you do so at your own risk.',
        },
      ],
    },
    {
      id: 'how-we-use',
      heading: '3. How we use personal data and our lawful bases',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We use personal data to provide the Service, keep it secure, support you, and improve the product. Under the Nigeria Data Protection Act 2023, the GDPR and similar laws, we rely on the following lawful bases:',
        },
        {
          kind: 'bullets',
          items: [
            'Contract: to create your account, provide the features you request, process payments and support you.',
            'Legitimate interests: to secure the Service, prevent abuse, debug problems, improve features, and understand aggregate usage. We balance these interests against your rights.',
            'Consent: to send optional marketing, to process optional AI features where consent is required, and for any non-essential cookies or similar technologies. You can withdraw consent at any time.',
            'Legal obligation: to comply with tax, accounting, consumer, data-protection, law-enforcement and app-store requirements.',
            'Vital interests or public interest: only in an emergency or where the law permits.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'We do not sell your personal data. We do not use your personal data for cross-context behavioural advertising. We do not use Your Content to train public AI models.',
        },
      ],
    },
    {
      id: 'ai-processing',
      heading: '4. AI processing',
      blocks: [
        {
          kind: 'paragraph',
          text: 'When you use Coach or AI roadmap features, we send the minimum context needed to generate a response. This may include your display name, bio, focus areas, coaching preferences, vision text, commitments, recent progress and the message you sent. We do not send your password, full payment details or sign-in tokens to the AI provider.',
        },
        {
          kind: 'paragraph',
          text: 'AI requests are processed by OpenRouter and the model provider it routes to. Those providers may process data in countries outside your own. We configure the integration to avoid training on your prompts where the provider offers that control, but provider policies and retention periods can change. Read the AI Disclosure for more detail.',
        },
        {
          kind: 'paragraph',
          text: 'Do not enter sensitive personal data, confidential business information, another person’s data without permission, or information you would not want a service provider to process. AI output can be wrong. See the AI Disclosure for limits and reporting options.',
        },
      ],
    },
    {
      id: 'sharing',
      heading: '5. When we share personal data',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We share personal data only as needed to run the Service, with appropriate safeguards:',
        },
        {
          kind: 'bullets',
          items: [
            'Service providers: Convex and Cloudflare for hosting and databases; OpenRouter and model providers for AI; authentication, email, analytics, crash-reporting, support and payment providers. They process data on our instructions and under contract.',
            'People you choose: accountability partners, circles and teams can see the content you share with them. You control those connections.',
            'Legal and safety: courts, regulators, law enforcement or other parties where required by law, to protect rights, safety or security, or to respond to valid legal process.',
            'Business transfers: a buyer or successor in a merger, acquisition, financing, reorganisation or sale of assets, subject to this Policy.',
            'With your consent: any other sharing we describe at the time.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'We require processors to protect personal data and to use it only for the services they provide to us. We do not authorise them to sell your data or use it for their own advertising.',
        },
      ],
    },
    {
      id: 'transfers',
      heading: '6. International transfers',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Correr is available in multiple countries, and our providers may process data in Nigeria, the European Economic Area, the United Kingdom, the United States and other countries. Data-protection laws in those countries may differ from your own.',
        },
        {
          kind: 'paragraph',
          text: 'Where required, we use appropriate safeguards for international transfers, such as standard contractual clauses, the UK International Data Transfer Addendum, provider data-processing agreements, and transfer risk assessments. You can contact us for more information about the safeguards used for your data.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '7. How long we keep data',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Account and profile data: while your account is active.',
            'Plans, goals, check-ins and coach messages: while your account is active, unless you delete them earlier.',
            'Deleted account data: removed from active systems promptly, normally within 30 days. Routine backups may take up to 90 days to age out.',
            'Support records: up to 24 months after the request closes, unless a longer period is needed for a legal claim.',
            'Security and access logs: normally up to 12 months.',
            'Payment and tax records: as long as required by tax and accounting law.',
            'Aggregated or de-identified data: retained without a fixed limit because it no longer identifies you.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'We may keep data longer where we are required by law, where a legal claim is pending, or where necessary to prevent fraud or abuse. When data is no longer needed, we delete it or anonymise it.',
        },
      ],
    },
    {
      id: 'security',
      heading: '8. Security',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We use technical and organisational measures designed to protect personal data, including encryption in transit, hashed passwords, secure token storage, access controls, least-privilege administration, logging, dependency updates and incident-response procedures.',
        },
        {
          kind: 'paragraph',
          text: 'No system is completely secure. You are responsible for keeping your device and credentials safe. If we become aware of a breach that is likely to result in a risk to your rights, we will notify you and the relevant authority within the period required by law.',
        },
      ],
    },
    {
      id: 'rights',
      heading: '9. Your privacy rights',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Depending on where you live, you may have the right to:',
        },
        {
          kind: 'bullets',
          items: [
            'Know whether we process your personal data and access a copy.',
            'Correct inaccurate or incomplete data.',
            'Delete your data, subject to legal retention obligations.',
            'Export your data in a portable format.',
            'Restrict or object to certain processing.',
            'Withdraw consent without affecting processing that already happened.',
            'Complain to a data-protection authority.',
            'Not be discriminated against for exercising your rights.',
          ],
        },
        {
          kind: 'paragraph',
          text: `You can exercise most rights in the app from Account > Export my data and Account > Delete account. You can also email ${PRIVACY_EMAIL}. We may need to verify your identity before acting. We aim to respond within 30 days, or within the shorter period required by local law.`,
        },
        {
          kind: 'paragraph',
          text: 'If you are in Nigeria, you can complain to the Nigeria Data Protection Commission. If you are in the EU or UK, you can complain to your local supervisory authority. We encourage you to contact us first so we can try to resolve the issue.',
        },
      ],
    },
    {
      id: 'us-privacy',
      heading: '10. United States privacy rights',
      blocks: [
        {
          kind: 'paragraph',
          text: 'If you are a resident of California or another US state with a comprehensive privacy law, you may have rights to know, access, correct, delete, port and opt out of certain processing. We do not sell personal data, and we do not share personal data for cross-context behavioural advertising as those terms are defined under California law.',
        },
        {
          kind: 'paragraph',
          text: 'You may exercise your rights by emailing the privacy contact above or using the in-app controls. You may use an authorised agent where the law allows. We will verify the request and respond within the period required by law. We will not discriminate against you for exercising a privacy right.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: '11. Cookies and local storage',
      blocks: [
        {
          kind: 'paragraph',
          text: 'On the web, we use essential cookies and similar storage to keep you signed in, protect against fraud and remember your preferences. On mobile, we use secure platform storage for your session and local storage for theme, onboarding progress and settings.',
        },
        {
          kind: 'paragraph',
          text: 'We do not use advertising cookies, cross-site tracking pixels or data brokers. Where non-essential storage is introduced, we will ask for consent where required and update this Policy. You can clear local storage through your browser or device settings, but some features may stop working.',
        },
      ],
    },
    {
      id: 'children',
      heading: '12. Children',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Correr is not directed at children. We require account holders to be at least 18 years old, or the age of legal majority in their jurisdiction. We do not knowingly collect personal data from children below that age. If we learn that a child has created an account, we will close it and delete the data, subject to legal retention requirements.',
        },
        {
          kind: 'paragraph',
          text: `If you believe a child has provided personal data to Correr, contact ${PRIVACY_EMAIL} so we can investigate.`,
        },
      ],
    },
    {
      id: 'automated',
      heading: '13. Automated decisions and profiling',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We use AI to generate suggestions, roadmaps and coaching replies. Those outputs support your decisions; they are not solely automated decisions that produce legal or similarly significant effects. We do not use automated profiling to set prices, deny service or make employment decisions.',
        },
        {
          kind: 'paragraph',
          text: 'You can choose not to use AI features. If you believe an automated output has significantly affected you, contact us and we will review the issue.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '14. Changes to this Policy',
      blocks: [
        {
          kind: 'paragraph',
          text: `We may update this Policy to reflect changes in the Service, law, providers or security practices. The date and version at the top show when it changed. If a change is material, we will give reasonable notice in the app or by email. Where the law requires fresh consent, we will ask for it before the change applies to you.`,
        },
      ],
    },
    {
      id: 'contact',
      heading: '15. Contact and complaints',
      blocks: [
        {
          kind: 'paragraph',
          text: `Privacy questions and requests: ${PRIVACY_EMAIL}. General support: ${SUPPORT_EMAIL}. Legal notices: ${LEGAL_EMAIL}. We take complaints seriously and will try to resolve them promptly. You also have the right to contact your local data-protection authority.`,
        },
      ],
    },
  ],
};

export const AI_DOCUMENT: LegalDocument = {
  id: 'ai',
  title: 'AI Disclosure',
  shortTitle: 'AI Disclosure',
  summary:
    'How Correr uses third-party AI, what data is sent, what the output can and cannot do, and how to report a problem.',
  sections: [
    {
      id: 'what-ai-does',
      heading: '1. What AI does in Correr',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Correr uses third-party artificial intelligence to generate coaching replies, roadmaps, plan adjustments and progress summaries. The AI is a writing and planning assistant. It is not a human coach, doctor, lawyer, financial adviser, therapist, employer or emergency service.',
        },
        {
          kind: 'paragraph',
          text: 'AI output is generated from patterns in data. It can be plausible but wrong. It can miss context, reflect bias, produce unsafe suggestions, or fail to notice that a goal is unrealistic. You are responsible for deciding whether to use it.',
        },
      ],
    },
    {
      id: 'provider',
      heading: '2. Who provides the AI',
      blocks: [
        {
          kind: 'paragraph',
          text: 'AI requests are sent from our servers to OpenRouter, which routes them to a third-party model provider. Our OpenRouter API key is stored on the server and is never shipped in the app. We may change providers or models over time to improve quality, safety, cost or availability.',
        },
        {
          kind: 'paragraph',
          text: 'OpenRouter and the model provider process the request to return a response. Their own terms and privacy policies apply to their processing. We configure the integration to avoid training on your prompts where the provider offers that control, but we cannot guarantee every provider’s retention or training practice beyond the controls available to us.',
        },
      ],
    },
    {
      id: 'data-sent',
      heading: '3. What data is sent to the AI',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We send the minimum context needed for the feature you are using. Depending on the feature, this can include:',
        },
        {
          kind: 'bullets',
          items: [
            'Your display name, bio and focus areas.',
            'Your coaching tone, reply length and saved coach context.',
            'The vision, goal or commitment you are working on.',
            'Recent check-ins, progress and blockers.',
            'The message you type to the coach.',
            'Recent messages in the same conversation, so the reply has context.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'We do not send your password, sign-in tokens, full payment details or account deletion data to the AI provider. Do not type sensitive data into Coach. This includes health information, financial account numbers, government identifiers, biometric data, another person’s private information, or confidential business information.',
        },
      ],
    },
    {
      id: 'limits',
      heading: '4. Limits and risks',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'AI output may be inaccurate, incomplete, biased, offensive, outdated or unsafe.',
            'AI does not know your medical history, legal position, finances or full personal circumstances.',
            'AI may suggest goals or actions that are unrealistic, harmful or unlawful in your jurisdiction.',
            'AI may produce the same or similar output for different users.',
            'AI features may be unavailable, slow or changed without notice.',
            'AI output is not confidential advice, and it is not a substitute for a qualified professional.',
          ],
        },
        {
          kind: 'callout',
          title: 'Do not rely on AI for emergencies',
          text: 'If you are in danger, thinking about harming yourself or someone else, or facing a medical emergency, contact local emergency services or a qualified crisis service immediately. Correr is not an emergency service.',
        },
      ],
    },
    {
      id: 'no-professional-advice',
      heading: '5. No professional advice',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Correr and its AI features do not provide medical, legal, financial, tax, mental-health, employment or other professional advice. Any general information is for planning and reflection only. Always consult a qualified professional who knows your circumstances before making an important decision.',
        },
        {
          kind: 'paragraph',
          text: 'You are responsible for any action you take based on AI output. We are not responsible for decisions you make about your health, money, relationships, career, business or legal rights.',
        },
      ],
    },
    {
      id: 'output',
      heading: '6. Ownership and use of output',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You keep ownership of the prompts and content you submit. As between you and Correr, you may use the AI output for your personal planning. We assign to you any rights we have in the output, subject to the provider’s terms and any third-party rights. Output may not be unique, and similar output may be generated for others.',
        },
        {
          kind: 'paragraph',
          text: 'You may not represent AI output as human-generated professional advice, use it to deceive or harm someone, or use it in a high-risk setting where an error could cause death, injury, financial loss or significant legal harm.',
        },
      ],
    },
    {
      id: 'reporting',
      heading: '7. Reporting a problem',
      blocks: [
        {
          kind: 'paragraph',
          text: 'If a reply is harmful, offensive, unsafe, discriminatory or clearly wrong, report it. In Coach, tap Report under the reply, or email support@correr.app with the conversation details. We review reports for safety and product quality, but we do not guarantee a personal response to every report.',
        },
        {
          kind: 'paragraph',
          text: 'We may remove content, adjust prompts, add safety filters, restrict features or change providers in response to reports. We may also report serious threats or illegal content to the appropriate authorities where required or permitted by law.',
        },
      ],
    },
    {
      id: 'choices',
      heading: '8. Your choices',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'You can use non-AI features such as creating goals, check-ins and progress tracking without opening Coach.',
            'You can change coaching tone, reply length and saved context in Coach settings.',
            'You can delete conversations from Coach history.',
            'You can delete your account and data from Account.',
            'You can contact us to ask how a particular AI feature uses your data.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Some features, including AI roadmaps, may be unavailable if you do not want your data processed by an AI provider. We will not treat that choice as a breach of these Terms.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '9. Changes to AI features',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may change models, providers, prompts, safety measures or the data sent to the AI as the product evolves. We will update this disclosure and the version date when those changes are material. Where the law requires consent, we will ask before applying the change to you.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '10. Contact',
      blocks: [
        {
          kind: 'paragraph',
          text: `AI safety or privacy questions: ${PRIVACY_EMAIL}. Product support and reports: ${SUPPORT_EMAIL}. Legal notices: ${LEGAL_EMAIL}.`,
        },
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  TERMS_DOCUMENT,
  PRIVACY_DOCUMENT,
  AI_DOCUMENT,
];
