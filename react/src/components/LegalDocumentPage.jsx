import React from 'react';
import PageHeader from './PageHeader';

const styles = {
    heroEyebrow: 'text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400',
    heroTitle: 'mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl',
    heroMeta: 'mt-3 text-sm font-medium text-gray-600 dark:text-gray-300',
    bodyText: 'text-sm leading-7 text-gray-700 dark:text-gray-200 sm:text-base',
    sectionTitle: 'text-lg font-semibold text-gray-900 dark:text-white sm:text-xl',
    list: 'list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700 marker:text-gray-500 dark:text-gray-200 dark:marker:text-gray-400 sm:text-base',
    contactCard: 'rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-4 dark:border-gray-600 dark:bg-gray-900/50',
    contactList: 'space-y-3',
    contactRow: 'flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3',
    contactLabel: 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:min-w-20',
    contactLink: 'text-gray-900 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-gray-700 hover:decoration-gray-500 dark:text-white dark:decoration-gray-600 dark:hover:text-gray-200',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s().-]{6,}$/;

const getContactHref = ({ href, value }) => {
    if (href) {
        return href;
    }

    const trimmedValue = value?.trim();

    if (!trimmedValue) {
        return null;
    }

    if (emailPattern.test(trimmedValue)) {
        return `mailto:${trimmedValue}`;
    }

    if (phonePattern.test(trimmedValue)) {
        return `tel:${trimmedValue.replace(/[^\d+]/g, '')}`;
    }

    return null;
};

const LegalDocumentPage = ({ title, effectiveDate, intro, sections }) => {
    return (
        <div className="page-fixed">
            <PageHeader title={title} backPath={-1} backLabel="Back" />

            <div className="flex-1 overflow-y-auto overscroll-y-contain bg-gray-100 dark:bg-gray-900">
                <div className="max-w-4xl mx-auto p-4 py-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6 dark:border-gray-700 dark:bg-gray-900/40">
                            <p className={styles.heroEyebrow}>{title}</p>
                            <h1 className={styles.heroTitle}>{title}</h1>
                            <p className={styles.heroMeta}>Effective date: {effectiveDate}</p>
                            <p className={`mt-4 ${styles.bodyText}`}>{intro}</p>
                        </div>

                        <ol className="mt-8 space-y-8">
                            {sections.map((section) => (
                                <li
                                    key={section.number}
                                    className="border-t border-gray-200 pt-6 first:border-t-0 first:pt-0 dark:border-gray-700"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:gap-5">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
                                            {section.number}
                                        </div>

                                        <section className="min-w-0 space-y-4">
                                            <h2 className={styles.sectionTitle}>{section.title}</h2>

                                            {section.paragraphs?.map((paragraph, paragraphIndex) => (
                                                <p
                                                    key={`${section.number}-paragraph-${paragraphIndex}`}
                                                    className={styles.bodyText}
                                                >
                                                    {paragraph}
                                                </p>
                                            ))}

                                            {section.lists?.map((list, listIndex) => (
                                                <div key={`${section.number}-list-${listIndex}`} className="space-y-3">
                                                    {list.intro ? <p className={styles.bodyText}>{list.intro}</p> : null}

                                                    <ul className={styles.list}>
                                                        {list.items.map((item, itemIndex) => (
                                                            <li key={`${section.number}-item-${listIndex}-${itemIndex}`}>{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}

                                            {section.closingParagraphs?.map((paragraph, paragraphIndex) => (
                                                <p
                                                    key={`${section.number}-closing-${paragraphIndex}`}
                                                    className={styles.bodyText}
                                                >
                                                    {paragraph}
                                                </p>
                                            ))}

                                            {section.contact?.length ? (
                                                <div className={styles.contactCard}>
                                                    <div className={styles.contactList}>
                                                        {section.contact.map((item, itemIndex) => {
                                                            const href = getContactHref(item);

                                                            return (
                                                                <div
                                                                    key={`${section.number}-contact-${item.label}-${itemIndex}`}
                                                                    className={styles.contactRow}
                                                                >
                                                                    <span className={styles.contactLabel}>{item.label}</span>
                                                                    {href ? (
                                                                        <a href={href} className={`${styles.bodyText} ${styles.contactLink}`}>
                                                                            {item.value}
                                                                        </a>
                                                                    ) : (
                                                                        <p className={styles.bodyText}>{item.value}</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </section>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalDocumentPage;
