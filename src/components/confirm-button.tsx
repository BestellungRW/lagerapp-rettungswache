"use client";

export default function ConfirmSubmitButton({
  formAction,
  className,
  message,
  children,
}: {
  formAction: (formData: FormData) => void | Promise<void>;
  className?: string;
  message: string;
  children: React.ReactNode;
}) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(message)) {
      e.preventDefault();
    }
  }

  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}