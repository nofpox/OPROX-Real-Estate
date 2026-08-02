/**
 * Property3DViewer.tsx — Native platform shim
 */
import React from "react";
import Property3DViewerWeb from "./Property3DViewer.web";

export default function Property3DViewer(props: any) {
  return <Property3DViewerWeb {...props} />;
}
