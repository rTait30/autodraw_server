import React from "react";

export function ItemSelector({
  label,
  options = [],
  value,
  onChange,

  getValue = (opt, index) => index,
  getLabel = (opt, index) => String(index + 1),

  onAdd,
  addLabel = "Add",
  columnsMobile = 4,

  className = "",
  gridClassName = "",
  buttonClassName = "",
  addButtonClassName = "",
}) {
  const btnRefs = React.useRef([]);
  const [indicatorStyle, setIndicatorStyle] = React.useState(null);

  const mobileWidthClass =
    columnsMobile === 4
      ? "w-[calc((100%-0.5rem*3)/4)]"
      : `w-[calc((100%-0.5rem*${columnsMobile - 1})/${columnsMobile})]`;

  // Move sliding indicator when value changes
  React.useLayoutEffect(() => {
    const index = options.findIndex((opt, i) =>
      Object.is(getValue(opt, i), value)
    );

    const el = btnRefs.current[index];
    if (!el) return;

    setIndicatorStyle({
      transform: `translate(${el.offsetLeft}px, ${el.offsetTop}px)`,
      width: el.offsetWidth,
      height: el.offsetHeight,
    });
  }, [value, options, getValue]);

  return (
    <div className={["mb-4 z-0", className].join(" ")}>
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2 dark:text-gray-300">
          {label}
        </label>
      )}

      <div
        className={["relative flex flex-wrap gap-2 overflow-hidden", gridClassName].join(" ")}
      >
        {/* Sliding Indicator */}
        {indicatorStyle && (
          <div
            className="absolute rounded-2xl bg-tertiary transition-all duration-200 ease-out z-[-1]"
            style={indicatorStyle}
          />
        )}

        {options.map((opt, index) => {
          const optValue = getValue(opt, index);
          const isActive = Object.is(optValue, value);

          return (
            <button
              key={String(optValue)}
              ref={(el) => (btnRefs.current[index] = el)}
              type="button"
              onClick={() => onChange?.(optValue)}
              aria-pressed={isActive}
              className={[
                mobileWidthClass,
                "h-12 md:w-32 md:h-16",
                "flex items-center justify-center",
                "rounded-2xl font-semibold select-none",
                "transition-all duration-150",
                "border-4 border-tertiary",
                "relative z-0", // keep above indicator
                isActive
                  ? "text-white bg-tertiary"
                  : "bg-transparent text-tertiary hover:bg-tertiary/5",
                buttonClassName,
              ].join(" ")}
            >
              {getLabel(opt, index)}
            </button>
          );
        })}

        {typeof onAdd === "function" && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={addLabel}
            title={addLabel}
            className={[
              mobileWidthClass,
              "h-12 md:w-32 md:h-16",
              "flex items-center justify-center",
              "rounded-2xl font-semibold transition-all duration-150",
              "border-4 border-gray-300 dark:border-gray-600",
              "text-gray-600 dark:text-gray-300",
              "md:hover:shadow-sm md:hover:-translate-y-[1px]",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              "relative z-0",
              addButtonClassName,
            ].join(" ")}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
