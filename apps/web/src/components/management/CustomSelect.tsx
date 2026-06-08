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
};

export function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  disabled = false,
  placeholder
}: CustomSelectProps) {
  const hasSelectedOption = options.some((option) => option.value === value);
  const renderedOptions = hasSelectedOption || !placeholder || options.some((option) => option.value === "")
    ? options
    : [{ disabled: true, label: placeholder, value: "" }, ...options];

  return (
    <div className={`mgmt-select-container ${className}`}>
      <select
        disabled={disabled}
        className="mgmt-select-native"
        value={hasSelectedOption ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {renderedOptions.map((option) => (
          <option key={option.value} disabled={option.disabled} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
        className="mgmt-select-trigger-arrow mgmt-select-native-arrow"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
