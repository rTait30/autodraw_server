import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SailForm from "../shadesail/Form";
import { GENERAL_DEFAULTS } from "../shadesail/constants";
import { GeneralSection } from "../GeneralSection";

// Accepts either:
// - attributesHydrate = { sails: [ {...}, {...} ] }  (new shape, preferred)
// - attributesHydrate = [ {...}, {...} ]             (legacy shape)
// - attributesHydrate = { ... }                      (single sail object)
function normalizeAttributes(attributesHydrate) {
  if (!attributesHydrate) return [];

  // New shape: { sails: [...] }
  if (
    typeof attributesHydrate === "object" &&
    Array.isArray(attributesHydrate.sails)
  ) {
    return attributesHydrate.sails;
  }

  // Legacy: already an array of attributes
  if (Array.isArray(attributesHydrate)) {
    return attributesHydrate;
  }

  // Legacy: single object of attributes
  if (
    typeof attributesHydrate === "object" &&
    Object.keys(attributesHydrate).length > 0
  ) {
    return [attributesHydrate];
  }

  return [];
}

export default function MultiShadeSailForm({
  formRef,
  generalDataHydrate = {},
  attributesHydrate = [],
  discrepancyChecker = false,
}) {
  const normalizedAttributes = useMemo(
    () => normalizeAttributes(attributesHydrate),
    [attributesHydrate]
  );

  const [generalData, setGeneralData] = useState(() => ({
    ...GENERAL_DEFAULTS,
    ...(generalDataHydrate ?? {}),
  }));

  const idCounter = useRef(0);
  const makeSailEntry = useCallback((attrs) => {
    const id = `sail-${idCounter.current++}`;
    return { id, attributesHydrate: attrs ?? undefined };
  }, []);

  const initialSailsRef = useRef(null);
  if (initialSailsRef.current === null) {
    const base = normalizedAttributes.length > 0 ? normalizedAttributes : [undefined];
    initialSailsRef.current = base.map((attrs) => makeSailEntry(attrs));
  }

  const [sails, setSails] = useState(() => initialSailsRef.current);
  const [activeSailId, setActiveSailId] = useState(
    () => initialSailsRef.current?.[0]?.id ?? null
  );

  const sailRefs = useRef(new Map());
  const getSailRef = useCallback((id) => {
    if (!sailRefs.current.has(id)) {
      sailRefs.current.set(id, React.createRef());
    }
    return sailRefs.current.get(id);
  }, []);

  const addSail = useCallback(() => {
    const newSail = makeSailEntry(undefined);
    setSails((prev) => [...prev, newSail]);
    setActiveSailId(newSail.id);
  }, [makeSailEntry]);

  const removeSail = useCallback((id) => {
    setSails((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((sail) => sail.id !== id);
      sailRefs.current.delete(id);
      setActiveSailId((current) => {
        if (current === id) {
          return next[next.length - 1]?.id ?? null;
        }
        return current;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!formRef) return;

    formRef.current = {
      getValues: () => {
        const sailsPayload = sails
          .map((sail) => {
            const sailRef = sailRefs.current.get(sail.id);
            if (!sailRef?.current?.getValues) return null;
            return sailRef.current.getValues(); // { general, attributes, calculated }
          })
          .filter(Boolean);

        // NEW SHAPE HERE:
        // attributes: { sails: [ attributesForSail1, attributesForSail2, ... ] }
        // calculated: { sails: [ calculatedForSail1, calculatedForSail2, ... ] }
        return {
          general: generalData,
          attributes: {
            sails: sailsPayload.map((payload) => payload.attributes ?? {}),
          },
          calculated: {
            sails: sailsPayload.map((payload) => payload.calculated ?? {}),
          },
        };
      },
    };

    return () => {
      if (formRef) formRef.current = null;
    };
  }, [formRef, sails, generalData]);

  return (
    <div className="p-3 space-y-4">
      {discrepancyChecker === false && (
        <GeneralSection data={generalData} setData={setGeneralData} />
      )}

      <section className="space-y-3">
        {/* Tab buttons for each sail + add */}
        <div className="flex flex-wrap items-center gap-2">
          {sails.map((sail, index) => (
            <button
              key={sail.id}
              type="button"
              className={`px-3 py-1 rounded border text-sm ${
                sail.id === activeSailId
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-neutral-300 bg-white"
              }`}
              onClick={() => setActiveSailId(sail.id)}
            >
              Sail {index + 1}
            </button>
          ))}
          <button
            type="button"
            className="px-3 py-1 rounded border border-dashed text-sm"
            onClick={addSail}
          >
            + Add sail
          </button>
        </div>

        {/* Only render the active sail */}
        <div className="space-y-2">
          {sails.map((sail, index) => {
            const sailRef = getSailRef(sail.id);
            return (
              <div
                key={sail.id}
                style={{ display: sail.id === activeSailId ? "block" : "none" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="headingStyle">Sail {index + 1}</h3>
                  {sails.length > 1 && (
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => removeSail(sail.id)}
                    >
                      Remove sail
                    </button>
                  )}
                </div>
                <SailForm
                  formRef={sailRef}
                  generalData={generalData}
                  onGeneralDataChange={setGeneralData}
                  attributesHydrate={sail.attributesHydrate}
                  discrepancyChecker={discrepancyChecker}
                  hideGeneralSection
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
