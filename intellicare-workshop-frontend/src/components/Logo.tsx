import { useState } from "react";

interface LogoProps {
  align?: "center" | "left";
  className?: string;
}

const LOGO_SRC = "/intellicare-logo-no-bg.png";

export default function Logo({
  align = "center",
  className = "h-18 sm:h-20 md:h-22",
}: LogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={LOGO_SRC}
      alt="IntelliCare"
      onError={() => setFailed(true)}
      className={`block w-auto object-contain ${
        align === "left" ? "mr-auto" : "mx-auto"
      } ${className}`}
    />
  );
}
