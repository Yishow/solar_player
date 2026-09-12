import { useState, useRef, useEffect, useId, type KeyboardEvent } from "react";

export type CustomSelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

export function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  disabled = false,
  placeholder,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpward, setIsUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = `${useId()}-listbox`;
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const searchRef = useRef({ text: "", time: 0 });
  const open = isOpen && !disabled;
  const enabledOptions = options.filter((option) => !option.disabled);
  const activeIndex = enabledOptions.findIndex((option) => option.value === activeValue);
  const activeOption = enabledOptions[activeIndex] ?? enabledOptions.find((option) => option.value === value) ?? enabledOptions[0];
  const activeOptionId = activeOption ? `${listId}-${options.indexOf(activeOption)}` : undefined;

  const openPopup = () => {
    if (disabled || enabledOptions.length === 0) return;
    setActiveValue((enabledOptions.find((option) => option.value === value) ?? enabledOptions[0])!.value);
    searchRef.current = { text: "", time: 0 };
    setIsOpen(true);
  };

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (open && activeOptionId) {
      document.getElementById(activeOptionId)?.scrollIntoView?.({ block: "nearest" });
    }
  }, [open, activeOptionId]);

  const hasSelectedOption = options.some((option) => option.value === value);
  const renderedOptions = hasSelectedOption || !placeholder || options.some((option) => option.value === "")
    ? options
    : [{ disabled: true, label: placeholder, value: "" }, ...options];

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || "");

  // 點擊外面關閉彈窗
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 動態判斷彈窗方向
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // 下拉選單 max-height 為 200px 加上 padding/gap 約 210px
      if (spaceBelow < 210 && rect.top > 210) {
        setIsUpward(true);
      } else {
        setIsUpward(false);
      }
    }
  }, [isOpen]);

  const handleOptionClick = (optValue: string, optDisabled?: boolean) => {
    if (disabled || optDisabled || !options.some((option) => option.value === optValue && !option.disabled)) return;
    onChange(optValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Tab" || event.key === "Escape") {
      setIsOpen(false);
      if (event.key === "Escape" && open) {
        event.preventDefault();
        triggerRef.current?.focus();
      }
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        openPopup();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        if (activeOption) handleOptionClick(activeOption.value);
        return;
      }
      if (!enabledOptions.length) return;
      const index = enabledOptions.indexOf(activeOption!);
      const next = event.key === "Home" ? 0 : event.key === "End" ? enabledOptions.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + enabledOptions.length) % enabledOptions.length;
      setActiveValue(enabledOptions[next]!.value);
    } else if (event.key.length === 1) {
      event.preventDefault();
      if (!open) openPopup();
      const now = Date.now();
      const text = `${now - searchRef.current.time < 700 ? searchRef.current.text : ""}${event.key.toLocaleLowerCase()}`;
      searchRef.current = { text, time: now };
      const match = enabledOptions.find((option) => option.label.toLocaleLowerCase().startsWith(text));
      if (match) setActiveValue(match.value);
    }
  };

  return (
    <div 
      className={`mgmt-select-container ${className}`} 
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
      }}
      style={{ zIndex: open ? 50 : undefined }}
    >
      {/* 保留原生值映射；可存取名稱與鍵盤互動由 trigger 提供。 */}
      <select
        aria-hidden="true"
        disabled={disabled}
        className="mgmt-select-native"
        tabIndex={-1}
        value={hasSelectedOption ? value : ""}
        onChange={(event) => handleOptionClick(event.target.value)}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          left: 0,
          top: 0,
          zIndex: -1,
        }}
      >
        {renderedOptions.map((option) => (
          <option key={option.value} disabled={option.disabled} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* 自訂的 Trigger 按鈕 */}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? activeOptionId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className={`mgmt-select-trigger ${open ? "is-active" : ""}`}
        onClick={() => open ? setIsOpen(false) : openPopup()}
        onKeyDown={handleKeyDown}
        style={{ 
          width: "100%", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          textAlign: "left",
          flex: 1
        }}
      >
        <span>{displayLabel}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mgmt-select-trigger-arrow"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* 自訂的 Popup 選項列表 */}
      {open && (
        <div id={listId} className={`mgmt-select-popup ${isUpward ? "is-upward" : ""}`} role="listbox" aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
          {renderedOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                id={`${listId}-${options.indexOf(option)}`}
                type="button"
                tabIndex={-1}
                data-active={option.value === activeOption?.value || undefined}
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                className={`mgmt-select-option ${isSelected ? "is-selected" : ""} ${option.disabled ? "is-disabled" : ""}`}
                disabled={option.disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleOptionClick(option.value, option.disabled)}
                role="option"
              >
                <span>{option.label}</span>
                {isSelected && <span className="mgmt-select-option-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
