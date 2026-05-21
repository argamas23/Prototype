import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { getLocalDateString } from "@/lib/datetime";

type DateInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

export function DateInput({ onFocus, onClick, onPointerDown, value, ...props }: DateInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const today = getLocalDateString();

  const showPicker = (isTrustedGesture: boolean) => {
    if (!isTrustedGesture) return;
    const input = ref.current as HTMLInputElement & { showPicker?: () => void };
    if (!input?.showPicker) return;
    try {
      input.showPicker();
    } catch {
      // Ignore browser gesture-policy exceptions (for example NotAllowedError).
    }
  };

  return (
    <Input
      ref={ref}
      type="date"
      value={(value as string | undefined) || today}
      onFocus={(event) => {
        onFocus?.(event);
      }}
      onClick={(event) => {
        showPicker(event.isTrusted);
        onClick?.(event);
      }}
      onPointerDown={(event) => {
        showPicker(event.isTrusted);
        onPointerDown?.(event);
      }}
      {...props}
    />
  );
}
