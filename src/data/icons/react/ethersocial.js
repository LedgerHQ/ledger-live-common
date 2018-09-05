//@flow
import React from "react";

type Props = {
  size: number,
  color: string
};

export default function Ethersocial({ size, color = "currentColor" }: Props) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size}>
      <path
        fill={color}
        d="M8.03 15.899c-.4 0-.72-.08-1.04-.32l-5.04-2.88c-.64-.4-1.04-1.04-1.04-1.84V7.02l7.84 4.48c.2.13.403.038.496-.121a.326.326 0 0 0-.097-.439L.91 6.22V2.06l1.52.88L6.99.3c.64-.4 1.44-.4 2.08 0l5.04 2.88c.64.4 1.04 1.04 1.04 1.84v3.84l-7.84-4.4c-.168-.087-.324-.035-.404.092a.278.278 0 0 0 .084.388l8.16 4.72v4.16l-1.52-.8-4.56 2.639c-.32.16-.64.24-1.04.24zm-5.76-6.48v1.44c0 .24.1.498.32.64l5.12 2.88a.6.6 0 0 0 .72 0l5.2-3.04.16.08v-.96L6.27 6.22c-.8-.48-1.18-1.532-.64-2.4.539-.866 1.712-1.058 2.4-.64l5.76 3.28V5.1c0-.24-.16-.48-.32-.64L8.35 1.58a.6.6 0 0 0-.72 0l-5.2 3.04-.16-.08v.96l7.44 4.32c.8.48 1.12 1.52.64 2.32-.48.8-1.52 1.12-2.32.64z"
      />
    </svg>
  );
}
