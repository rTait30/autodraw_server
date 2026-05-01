import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_GENERAL_FIELDS = Object.freeze({
  name: '',
  client_id: 0,
  due_date: '',
  info: '',
  order_type: 'job',
});

function normalizeProductName(productName) {
  return String(productName || '')
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function humanizeKey(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isPrimitive(value) {
  return value === null || value === undefined || typeof value !== 'object';
}

function isBlankValue(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function deepEqual(left, right) {
  if (Object.is(left, right)) return true;

  if (typeof left !== typeof right) return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => deepEqual(item, right[index]));
  }

  if (left && right && typeof left === 'object') {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every((key) => deepEqual(left[key], right[key]));
  }

  return false;
}

function formatPrimitive(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : String(value);
  return String(value);
}

function getCountLabel(count, noun = 'field') {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function getValueMeta(value) {
  if (Array.isArray(value)) return getCountLabel(value.length, 'item');
  if (isPrimitive(value)) return 'Value';
  return getCountLabel(Object.keys(value).length, 'field');
}

function shouldHideKey(key) {
  return key === 'wg_data' || key === '__label' || key === '__index';
}

function filterHiddenData(value) {
  if (Array.isArray(value)) {
    return value.map(filterHiddenData);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !shouldHideKey(key))
      .map(([key, childValue]) => [key, filterHiddenData(childValue)])
  );
}

function pruneLooseData(value) {
  if (isPrimitive(value)) {
    return isBlankValue(value) ? undefined : value;
  }

  if (Array.isArray(value)) {
    const filtered = value
      .map((item) => pruneLooseData(item))
      .filter((item) => item !== undefined);

    return filtered.length ? filtered : undefined;
  }

  const filteredEntries = Object.entries(value)
    .filter(([key]) => !shouldHideKey(key))
    .map(([key, childValue]) => [key, pruneLooseData(childValue)])
    .filter(([, childValue]) => childValue !== undefined);

  return filteredEntries.length ? Object.fromEntries(filteredEntries) : undefined;
}

function withArrayItemLabel(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return item;
  }

  if (item.__label || item.name || item.label || item.part_name || item.sku || item.id) {
    return item;
  }

  return { __index: index, __label: `Item ${index + 1}`, ...item };
}

function pruneToDefaults(value, defaults) {
  if (defaults === undefined) {
    return undefined;
  }

  if (isPrimitive(defaults)) {
    if (value === undefined || isBlankValue(value)) {
      return undefined;
    }

    return deepEqual(value, defaults) ? undefined : value;
  }

  if (Array.isArray(defaults)) {
    if (!Array.isArray(value) || value.length === 0) {
      return undefined;
    }

    if (defaults.length === 0) {
      return pruneLooseData(value);
    }

    const itemDefaults = defaults[0];
    const filtered = value
      .map((item, index) => {
        const next = pruneToDefaults(item, itemDefaults);
        return next === undefined ? undefined : withArrayItemLabel(next, index);
      })
      .filter((item) => item !== undefined);

    return filtered.length ? filtered : undefined;
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const filteredEntries = Object.entries(defaults)
    .filter(([key]) => !shouldHideKey(key))
    .map(([key, defaultValue]) => [key, pruneToDefaults(value[key], defaultValue)])
    .filter(([, childValue]) => childValue !== undefined);

  return filteredEntries.length ? Object.fromEntries(filteredEntries) : undefined;
}

function buildFilteredItem(item, index, attributeDefaults) {
  const filteredItem = {};
  const defaultName = `Item ${index + 1}`;
  const name = typeof item?.name === 'string' ? item.name.trim() : '';

  if (name && name !== defaultName) {
    filteredItem.name = name;
  }

  const attributesSource = filterHiddenData(item?.attributes || {});
  const attributes = attributeDefaults
    ? pruneToDefaults(attributesSource, attributeDefaults)
    : pruneLooseData(attributesSource);

  if (attributes !== undefined) {
    filteredItem.attributes = attributes;
  }

  return Object.keys(filteredItem).length ? filteredItem : undefined;
}

function useConfirmationConfig(productName) {
  const [config, setConfig] = useState({
    loading: Boolean(productName),
    projectDefaults: null,
    attributeDefaults: null,
    transformConfirmationData: null,
  });

  useEffect(() => {
    let cancelled = false;
    const normalizedProductName = normalizeProductName(productName);

    if (!normalizedProductName) {
      setConfig({
        loading: false,
        projectDefaults: null,
        attributeDefaults: null,
        transformConfirmationData: null,
      });
      return () => {
        cancelled = true;
      };
    }

    setConfig((current) => ({ ...current, loading: true }));

    Promise.allSettled([
      import(`./products/${normalizedProductName}/Form.jsx`),
      import(`./products/${normalizedProductName}/confirmation.js`),
    ]).then(([formResult, confirmationResult]) => {
      if (cancelled) return;

      const formModule = formResult.status === 'fulfilled' ? formResult.value : null;
      const confirmationModule = confirmationResult.status === 'fulfilled' ? confirmationResult.value : null;

      setConfig({
        loading: false,
        projectDefaults: formModule?.PROJECT_DEFAULTS ?? null,
        attributeDefaults: formModule?.ATTRIBUTE_DEFAULTS ?? formModule?.DEFAULT_ATTRIBUTES ?? null,
        transformConfirmationData: confirmationModule?.transformConfirmationData ?? null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [productName]);

  return config;
}

function getItemTitle(item, index) {
  if (!item || typeof item !== 'object') return `Item ${index + 1}`;

  if (item.__label) return item.__label;

  const identifier = item.name || item.label || item.part_name || item.sku || item.id;
  return identifier ? `Item ${index + 1}: ${identifier}` : `Item ${index + 1}`;
}

function getItemMeta(item) {
  if (!item || typeof item !== 'object') return '';

  const quantity = item.qty ?? item.quantity ?? item.attributes?.qty ?? item.attributes?.quantity;
  if (quantity !== null && quantity !== undefined && quantity !== '') {
    return `Qty ${formatPrimitive(quantity)}`;
  }

  return getValueMeta(item);
}

function DisclosureIcon() {
  return (
    <svg
      className="project-confirmation-chevron h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetailsSummary({ title, meta, className = '', titleClassName = 'text-sm font-semibold text-gray-800 dark:text-gray-100' }) {
  return (
    <summary
      className={`flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden ${className}`}
      style={{ listStyle: 'none' }}
    >
      <span className="flex min-w-0 items-center gap-2">
        <DisclosureIcon />
        <span className={titleClassName}>{title}</span>
      </span>
      {meta ? <span className="text-xs uppercase tracking-wide text-gray-400">{meta}</span> : null}
    </summary>
  );
}

function PrimitiveRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-1.5 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {humanizeKey(label)}
      </dt>
      <dd className="break-words text-sm font-medium text-gray-900 dark:text-gray-100 sm:text-right">
        {formatPrimitive(value)}
      </dd>
    </div>
  );
}

function SectionContent({ value, depth = 0, path = 'value' }) {
  if (isPrimitive(value)) {
    return (
      <div className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">
        {formatPrimitive(value)}
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return <div className="text-sm text-gray-500 dark:text-gray-400">No items.</div>;
    }

    const allPrimitive = value.every(isPrimitive);

    if (allPrimitive) {
      return (
        <div className="pl-4 sm:pl-5">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {value.map((item, index) => (
              <li
                key={`${path}.${index}`}
                className="break-words py-1.5 text-sm text-gray-700 dark:text-gray-200"
              >
                {formatPrimitive(item)}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div className="space-y-1.5 border-l border-gray-200 pl-4 dark:border-gray-700 sm:pl-5">
        {value.map((item, index) => (
          <details
            key={`${path}.${index}`}
            open={depth < 2 || index === 0}
            className="project-confirmation-details py-1"
          >
            <DetailsSummary
              title={getItemTitle(item, index)}
              meta={getItemMeta(item)}
              className="py-1 text-left"
            />
            <div className="pt-1.5">
              <SectionContent value={item} depth={depth + 1} path={`${path}.${index}`} />
            </div>
          </details>
        ))}
      </div>
    );
  }

  const entries = Object.entries(value);

  if (!entries.length) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">No data.</div>;
  }

  return <ObjectEntries value={value} depth={depth} path={path} />;
}

function RenderField({ label, value, depth, path }) {
  if (isPrimitive(value)) {
    return <PrimitiveRow label={label} value={value} />;
  }

  return (
    <div className="py-1.5">
      <div className="border-l border-gray-200 pl-4 dark:border-gray-700 sm:pl-5">
        <div className="flex items-center justify-between gap-3 py-1">
          <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {humanizeKey(label)}
          </h5>
          <span className="text-xs uppercase tracking-wide text-gray-400">
            {getValueMeta(value)}
          </span>
        </div>
        <div className="pt-1">
          <SectionContent value={value} depth={depth + 1} path={path} />
        </div>
      </div>
    </div>
  );
}

function ObjectEntries({ value, depth, path }) {
  return (
    <dl className="divide-y divide-gray-200 dark:divide-gray-700">
      {Object.entries(value)
        .filter(([key]) => !shouldHideKey(key))
        .map(([key, childValue]) => (
        <RenderField key={`${path}.${key}`} label={key} value={childValue} depth={depth} path={`${path}.${key}`} />
      ))}
    </dl>
  );
}

export default function ProjectConfirmation({ project, productName }) {
  if (!project) return null;

  const config = useConfirmationConfig(productName);

  const { generalSection, projectAttributes, products, summaryName, summaryProduct } = useMemo(() => {
    const hiddenProject = filterHiddenData(project);
    const filteredGeneral = pruneToDefaults(hiddenProject.general || {}, DEFAULT_GENERAL_FIELDS) || {};
    const filteredProjectAttributes = config.projectDefaults
      ? pruneToDefaults(hiddenProject.project_attributes || {}, config.projectDefaults)
      : pruneLooseData(hiddenProject.project_attributes || {});
    const filteredProducts = (Array.isArray(hiddenProject.products) ? hiddenProject.products : [])
      .map((item, index) => buildFilteredItem(item, index, config.attributeDefaults))
      .filter(Boolean);

    const transformed = config.transformConfirmationData?.({
      generalSection: filteredGeneral,
      projectAttributes: filteredProjectAttributes || null,
      products: filteredProducts,
    });

    const nextGeneralSection = transformed?.generalSection ?? filteredGeneral;
    const nextProjectAttributes = (transformed?.projectAttributes ?? filteredProjectAttributes) || null;
    const nextProducts = transformed?.products ?? filteredProducts;

    return {
      generalSection: nextGeneralSection,
      projectAttributes: nextProjectAttributes,
      products: nextProducts,
      summaryName: nextGeneralSection.name || hiddenProject.general?.name || '-',
      summaryProduct:
        hiddenProject.product?.name ||
        productName ||
        '-',
    };
  }, [project, productName, config.projectDefaults, config.attributeDefaults, config.transformConfirmationData]);

  return (
    <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4 pr-2">
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-tertiary font-medium">
          Please review the entered project data below before saving.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950/30">
          <p className="text-xs uppercase tracking-wide text-gray-400">Project Name</p>
          <p className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
            {summaryName}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950/30">
          <p className="text-xs uppercase tracking-wide text-gray-400">Product</p>
          <p className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
            {summaryProduct}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950/30">
          <p className="text-xs uppercase tracking-wide text-gray-400">Items</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {products.length}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {Object.keys(generalSection).length > 0 && (
          <details open className="project-confirmation-details rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950/30">
            <DetailsSummary
              title="General"
              meta={getCountLabel(Object.keys(generalSection).length)}
              className="px-4 py-2.5"
            />
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              <ObjectEntries value={generalSection} depth={0} path="general" />
            </div>
          </details>
        )}

        {config.loading ? (
          <div className="px-1 py-2 text-sm text-gray-500 dark:text-gray-400">
            Preparing entered-data summary...
          </div>
        ) : projectAttributes && (
          <details open className="project-confirmation-details rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950/30">
            <DetailsSummary
              title="Project Attributes"
              meta={getValueMeta(projectAttributes)}
              className="px-4 py-2.5"
            />
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              <SectionContent value={projectAttributes} depth={0} path="project_attributes" />
            </div>
          </details>
        )}

        {!config.loading && (
        <details open className="project-confirmation-details rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950/30">
          <DetailsSummary
            title="Items"
            meta={getCountLabel(products.length, 'item')}
            className="px-4 py-2.5"
          />
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            {products.length ? (
              <div className="space-y-2">
                {products.map((item, index) => (
                  <details
                    key={`product.${index}`}
                    open
                    className="project-confirmation-details border-l-2 border-gray-200 pl-3 dark:border-gray-700"
                  >
                    <DetailsSummary
                      title={getItemTitle(item, index)}
                      meta={getItemMeta(item)}
                      className="py-1.5 text-left"
                    />
                    <div className="pt-1.5">
                      <SectionContent value={item} depth={1} path={`products.${index}`} />
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No items in this project.</p>
            )}
          </div>
        </details>
        )}
      </div>
      <style>{`
        .project-confirmation-details[open] > summary .project-confirmation-chevron {
          transform: rotate(90deg);
        }
      `}</style>
    </div>
  );
}
