import React, { memo, useState } from "react";
import { imageSrcSet, optimizedImage } from "../utils/imageUrl";

const FALLBACK =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
       <rect width="100%" height="100%" fill="#0f172a"/>
       <text x="50%" y="50%" fill="#64748b" font-family="sans-serif"
             font-size="24" text-anchor="middle">No cover</text>
     </svg>`,
  );

const SmartImage = ({
  src,
  alt,
  className = "",
  width = 400,
  height = 600,
  sizes = "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px",
  priority = false,
  ...rest
}) => {
  // Track WHICH src failed: the component is memoized and reused across lists and
  // route changes, so a plain boolean would keep showing the fallback for a new,
  // perfectly valid image.
  const [failedSrc, setFailedSrc] = useState(null);
  const failed = src != null && failedSrc === src;
  const resolved = failed ? FALLBACK : optimizedImage(src, width);

  return (
    <img
      src={resolved}
      srcSet={failed ? undefined : imageSrcSet(src)}
      sizes={failed ? undefined : sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "low"}
      onError={() => setFailedSrc(src)}
      className={className}
      {...rest}
    />
  );
};

export default memo(SmartImage);
