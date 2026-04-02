import React from 'react';
import LegalDocumentPage from '../components/LegalDocumentPage';

const privacySections = [
    {
        number: '1',
        title: 'What this policy covers',
        paragraphs: [
            'This policy applies to information collected through our website, software, and related services.',
        ],
    },
    {
        number: '2',
        title: 'What information we collect',
        paragraphs: [
            'We currently aim to collect project and technical information rather than general customer contact details. Depending on how the platform is used, we may collect:',
        ],
        lists: [
            {
                items: [
                    'project specifications',
                    'measurements and dimensions',
                    'drawings and plans',
                    'project notes',
                    'product and material selections',
                    'uploaded files and images',
                    'usage, device, and technical log information',
                    'account or access metadata if logins are enabled',
                ],
            },
        ],
        closingParagraphs: [
            'In some cases, project information may also include personal information where it identifies or could reasonably identify an individual, such as a name on a drawing, a residential site address, or identifying photos. Under Australian privacy law, personal information includes information about an identified or reasonably identifiable individual.',
        ],
    },
    {
        number: '3',
        title: 'Why we collect information',
        paragraphs: [
            'We collect and use information to:',
        ],
        lists: [
            {
                items: [
                    'provide and operate the platform',
                    'receive and process project requests',
                    'prepare designs, estimates, layouts, and production-related outputs',
                    'maintain project records',
                    'improve platform performance and internal workflows',
                    'secure and administer the platform',
                    'comply with legal obligations',
                ],
            },
        ],
        closingParagraphs: [
            'If we collect personal information, we will generally use it for the primary purpose for which it was collected, or for related purposes permitted by law.',
        ],
    },
    {
        number: '4',
        title: 'How we collect information',
        paragraphs: [
            'We collect information when users:',
        ],
        lists: [
            {
                items: [
                    'enter information into forms',
                    'upload files, plans, or images',
                    'submit project details',
                    'interact with the platform',
                    'use connected services or integrations, if enabled',
                ],
            },
        ],
        closingParagraphs: [
            'We may also automatically collect technical information such as browser type, device details, timestamps, and system activity logs for security and operational purposes.',
        ],
    },
    {
        number: '5',
        title: 'If you provide personal information we did not ask for',
        paragraphs: [
            'If we receive unsolicited personal information, we may review whether we are permitted to keep it. If not, we may delete or de-identify it where lawful and reasonable.',
        ],
    },
    {
        number: '6',
        title: 'Disclosure of information',
        paragraphs: [
            'We may disclose information to:',
        ],
        lists: [
            {
                items: [
                    'employees, contractors, and related entities involved in the project',
                    'hosting, storage, infrastructure, and software service providers',
                    'professional advisers',
                    'regulators, courts, or authorities where required by law',
                    'a purchaser or successor in connection with a business restructure or sale',
                ],
            },
        ],
        closingParagraphs: [
            'We do not sell personal information.',
        ],
    },
    {
        number: '7',
        title: 'Storage and security',
        paragraphs: [
            'We take reasonable steps to protect information we hold from misuse, interference, loss, and unauthorised access, modification, or disclosure. Those steps may include access controls, authentication, secure hosting, logging, backups, and other technical or organisational safeguards.',
            'However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
        ],
    },
    {
        number: '8',
        title: 'Overseas disclosure',
        paragraphs: [
            'Our service providers may store or process information outside Australia. Where this occurs, we will take reasonable steps to use appropriate providers and protections.',
        ],
    },
    {
        number: '9',
        title: 'Retention',
        paragraphs: [
            'We retain information for as long as reasonably necessary for project delivery, system administration, internal records, dispute resolution, legal compliance, and legitimate business purposes.',
        ],
    },
    {
        number: '10',
        title: 'Access and correction',
        paragraphs: [
            'If we hold personal information about you, you may request access to it or ask us to correct it, subject to any legal exceptions.',
        ],
    },
    {
        number: '11',
        title: 'Complaints',
        paragraphs: [
            'If you have a privacy concern or complaint, contact us using the details below. We will consider your complaint and respond within a reasonable time.',
            'If applicable, individuals may also have the right to complain to the Office of the Australian Information Commissioner.',
        ],
    },
    {
        number: '12',
        title: 'Changes to this policy',
        paragraphs: [
            'We may update this Privacy Policy from time to time by publishing the updated version on the platform.',
        ],
    },
    {
        number: '13',
        title: 'Contact',
        paragraphs: [
            'For privacy questions, access requests, correction requests, or complaints, contact:',
        ],
        contact: [
            { label: 'Business', value: 'D&R Group' },
            { label: 'Email', value: 'rtait@drgroup.com.au' },
            { label: 'Phone', value: '0466 185 676' },
        ],
    },
];

const PrivacyPolicy = () => {
    return (
        <LegalDocumentPage
            title="Privacy Policy"
            effectiveDate="02/04/2026"
            intro="This Privacy Policy explains how [Platform Name] handles information submitted through the platform."
            sections={privacySections}
        />
    );
};

export default PrivacyPolicy;
