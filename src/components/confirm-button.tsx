"use client";

import { useFormStatus } from "react-dom";

/** 확인 창을 띄운 뒤에만 서버 액션을 실행하는 버튼. */
export function ConfirmButton({
  action,
  message,
  className,
  children,
}: {
  action: () => Promise<void>;
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <Submit className={className}>{children}</Submit>
    </form>
  );
}

function Submit({ className, children }: { className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className ?? ""} disabled:opacity-60`}>
      {children}
    </button>
  );
}
