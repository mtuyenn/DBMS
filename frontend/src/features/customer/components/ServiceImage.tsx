import { useState, type ImgHTMLAttributes } from "react";
import { serviceImagePlaceholder } from "../serviceImages";

type ServiceImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "onError">;

/** Keep unavailable service photos from rendering the browser's broken-image icon. */
export function ServiceImage({ src, alt, ...props }: ServiceImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = src?.trim() || serviceImagePlaceholder;
  return <img {...props} src={failedSource === source ? serviceImagePlaceholder : source}
    alt={alt} onError={() => setFailedSource(source)} />;
}
