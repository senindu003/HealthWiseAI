export interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  numberOrSpecial: boolean;
}

// Mirrors the server-side PasswordPolicyValidator exactly (8+ chars, upper, lower,
// number-or-special) so the live checklist never promises something the backend rejects.
export function getPasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numberOrSpecial: /[0-9!@#$%^&*()_+\-=[\]{}|;:'",.<>/?]/.test(password),
  };
}

export function passwordChecksPass(checks: PasswordChecks): boolean {
  return checks.length && checks.uppercase && checks.lowercase && checks.numberOrSpecial;
}

const STRENGTH_COLORS = ['bg-error', 'bg-error', 'bg-warning', 'bg-warning', 'bg-success'];

interface PasswordStrengthChecklistProps {
  password: string;
  confirmPassword?: string;
  showConfirmMatch?: boolean;
}

export default function PasswordStrengthChecklist({
  password,
  confirmPassword,
  showConfirmMatch = false,
}: PasswordStrengthChecklistProps) {
  const checks = getPasswordChecks(password);
  const score = [checks.length, checks.uppercase, checks.lowercase, checks.numberOrSpecial].filter(Boolean).length;
  const matches = password.length > 0 && password === confirmPassword;

  return (
    <div className="space-y-2">
      {password.length > 0 && (
        <div className="h-1.5 w-full rounded-full bg-surface-container-low overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${STRENGTH_COLORS[score]}`}
            style={{ width: `${(score / 4) * 100}%` }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-surface-container-low rounded-xl p-3">
        <ChecklistItem label="8+ characters" passed={checks.length} />
        <ChecklistItem label="Uppercase" passed={checks.uppercase} />
        <ChecklistItem label="Lowercase" passed={checks.lowercase} />
        <ChecklistItem label="Number/Special" passed={checks.numberOrSpecial} />
      </div>

      {showConfirmMatch && confirmPassword !== undefined && confirmPassword.length > 0 && (
        <div className={`flex items-center gap-1.5 ${matches ? 'text-success' : 'text-error'}`}>
          <span className="material-symbols-outlined text-base">{matches ? 'check_circle' : 'cancel'}</span>
          <span className="font-label-sm text-label-sm">{matches ? 'Passwords match' : 'Passwords do not match'}</span>
        </div>
      )}
    </div>
  );
}

function ChecklistItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${passed ? 'text-success' : 'text-text-tertiary'}`}>
      <span className="material-symbols-outlined text-base">{passed ? 'check_circle' : 'radio_button_unchecked'}</span>
      <span className="font-label-sm text-label-sm">{label}</span>
    </div>
  );
}
