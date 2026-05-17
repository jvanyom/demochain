import type {InputHTMLAttributes, Ref, TextareaHTMLAttributes, ReactNode} from 'react';

const base = 'w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    ref?: Ref<HTMLInputElement>;
}

export function Input({className = '', ref, ...rest}: InputProps) {
    return <input ref={ref} {...rest} className={`${base} ${className}`}/>;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({className = '', rows = 4, ref, ...rest}: TextareaProps) {
    return <textarea ref={ref} rows={rows} {...rest} className={`${base} resize-none ${className}`}/>;
}

interface LabelProps {
    label: string;
    children: ReactNode;
    hint?: string;
}

export function Field({label, children, hint}: LabelProps) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
        </label>
    );
}
