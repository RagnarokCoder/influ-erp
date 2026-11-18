import React, { useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isRequired?: boolean;
}

export default function Input({ label, error, className = "", isRequired = false, id, ...rest }: InputProps) {
  const auto = useId();
  const campo = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={campo} className="text-[12px] font-medium text-ash">{label}{isRequired && " *"}</label>}
      <input
        id={campo}
        className={`border border-hairline rounded-[8px] px-3 py-2 text-[15px] text-carbon bg-white focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15 transition-all ${className}`}
        {...rest}
      />
      {error && <small className="text-danger font-medium text-[11px]">{error}</small>}
    </div>
  );
}
