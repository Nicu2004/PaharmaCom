import { useState, type InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

/** Password field with a show/hide button. */
export default function PasswordInput({ label, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="acct-field">
      <span>{label}</span>
      <div className="acct-field__wrap">
        <input {...rest} type={visible ? 'text' : 'password'} />
        <button
          type="button"
          className="acct-field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ascunde parola' : 'Arată parola'}
          aria-pressed={visible}
        >
          {visible ? 'Ascunde' : 'Arată'}
        </button>
      </div>
    </label>
  );
}
