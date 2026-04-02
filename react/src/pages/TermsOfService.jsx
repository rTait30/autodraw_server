import React from 'react';
import LegalDocumentPage from '../components/LegalDocumentPage';

const termsSections = [
    {
        number: '1',
        title: 'About the service',
        paragraphs: [
            'DRG Platform is a platform used to collect, store, process, and manage project specification information for quoting, design, planning, manufacturing, or related business purposes.',
        ],
    },
    {
        number: '2',
        title: 'Acceptance of these terms',
        paragraphs: [
            'By accessing or using the service, you agree to these Terms of Service. If you do not agree, you must not use the service.',
        ],
    },
    {
        number: '3',
        title: 'Eligibility and authority',
        paragraphs: [
            'You must only use the service if you are authorised to provide the information you submit and to act on behalf of any business or organisation you represent.',
        ],
    },
    {
        number: '4',
        title: 'Information you submit',
        lists: [
            {
                intro: 'You may submit project-related information such as:',
                items: [
                    'measurements',
                    'specifications',
                    'drawings',
                    'project notes',
                    'site details',
                    'product selections',
                    'supporting documents or images',
                ],
            },
            {
                intro: 'You must ensure that:',
                items: [
                    'the information you provide is accurate to the best of your knowledge',
                    'you have the right to provide it',
                    "it does not infringe another person's rights",
                    'it does not contain unlawful, harmful, or misleading content',
                ],
            },
        ],
    },
    {
        number: '5',
        title: 'Permitted use',
        paragraphs: [
            'You may use the service only for lawful business purposes connected with requesting, managing, reviewing, or producing projects.',
        ],
        lists: [
            {
                intro: 'You must not:',
                items: [
                    'misuse the service',
                    'interfere with its operation',
                    'attempt to gain unauthorised access',
                    'upload malicious code',
                    'use the service in a way that infringes intellectual property or privacy rights',
                ],
            },
        ],
    },
    {
        number: '6',
        title: 'How we use submitted project information',
        lists: [
            {
                intro: 'We may use submitted information to:',
                items: [
                    'assess project requirements',
                    'prepare quotes, designs, layouts, or production outputs',
                    'improve workflows and service quality',
                    'keep internal records relating to the project',
                    'support troubleshooting, auditing, and platform administration',
                ],
            },
        ],
        paragraphs: [
            'Where permitted by law, we may also use de-identified or aggregated technical and project data to improve the platform, reporting, and internal processes.',
        ],
    },
    {
        number: '7',
        title: 'Intellectual property',
        paragraphs: [
            'You retain ownership of the content and information you submit, subject to any third-party rights.',
            'By submitting information through the service, you grant us a non-exclusive, worldwide, royalty-free licence to use, store, copy, process, modify, and communicate that information as reasonably necessary to operate, provide, maintain, and improve the service and to perform the relevant project work.',
            'We retain all rights in the platform itself, including its software, design, processes, and underlying intellectual property.',
        ],
    },
    {
        number: '8',
        title: 'No guarantee of suitability or error-free results',
        paragraphs: [
            'The service may assist with calculations, layouts, specifications, drawings, estimates, or recommendations. Unless expressly agreed otherwise in writing:',
        ],
        lists: [
            {
                items: [
                    'outputs are provided as a tool to assist project work',
                    'you remain responsible for checking final specifications and suitability',
                    'we do not guarantee that the service will be uninterrupted, error-free, or suitable for every purpose',
                ],
            },
        ],
    },
    {
        number: '9',
        title: 'Availability and changes',
        paragraphs: [
            'We may change, suspend, or discontinue any part of the service at any time, including features, functions, or access arrangements.',
        ],
    },
    {
        number: '10',
        title: 'Data storage and retention',
        paragraphs: [
            'We may store submitted project information for as long as reasonably necessary for project delivery, record keeping, troubleshooting, legal compliance, and legitimate business operations, unless a longer period is required or permitted by law.',
        ],
    },
    {
        number: '11',
        title: 'Confidentiality',
        paragraphs: [
            'We will take reasonable steps to protect project information we hold from unauthorised access, misuse, and disclosure. However, no system can be guaranteed completely secure.',
        ],
    },
    {
        number: '12',
        title: 'Third-party services',
        paragraphs: [
            'The platform may rely on hosting providers, cloud infrastructure, analytics, file storage, or other service providers. We may use those providers to operate the service.',
        ],
    },
    {
        number: '13',
        title: 'Limitation of liability',
        paragraphs: [
            'To the maximum extent permitted by law:',
        ],
        lists: [
            {
                items: [
                    'the service is provided on an "as is" and "as available" basis',
                    'we exclude all warranties not expressly stated',
                    'we are not liable for indirect, incidental, special, or consequential loss',
                    'our total liability in connection with the service is limited to the amount you paid us for the relevant service in the 12 months before the claim, or if no amount was paid, a reasonable nominal amount permitted by law',
                ],
            },
        ],
        closingParagraphs: [
            'Nothing in these Terms excludes rights that cannot legally be excluded.',
        ],
    },
    {
        number: '14',
        title: 'Indemnity',
        paragraphs: [
            'You agree to indemnify us against claims, losses, or liabilities arising from your misuse of the service, your breach of these Terms, or your submission of information you were not authorised to provide.',
        ],
    },
    {
        number: '15',
        title: 'Termination',
        paragraphs: [
            'We may suspend or terminate access to the service if these Terms are breached, if required by law, or if continued access would create security, legal, or operational risk.',
        ],
    },
    {
        number: '16',
        title: 'Governing law',
        paragraphs: [
            'These Terms are governed by the laws of Queensland, Australia, unless another Australian jurisdiction is specified by us.',
        ],
    },
    {
        number: '17',
        title: 'Contact',
        paragraphs: [
            'For questions about these Terms, contact:',
        ],
        contact: [
            { label: 'Business', value: 'D&R Group' },
            { label: 'Email', value: 'rtait@drgroup.com.au' },
            { label: 'Phone', value: '0466 185 676' },
        ],
    },
];

const TermsOfService = () => {
    return (
        <LegalDocumentPage
            title="Terms of Service"
            effectiveDate="02/04/2026"
            intro="Welcome to DRG Portal. These Terms of Service govern your access to and use of our website, software, and related services."
            sections={termsSections}
        />
    );
};

export default TermsOfService;
