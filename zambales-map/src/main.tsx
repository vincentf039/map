import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

export type Settings = {
  height: number;
  zoomLevel: number;
  mapColor: string;
  mapBorderColor: string;
  hoverColor: string;
  borderWeight: number;
};

declare const elementorFrontend: {
  hooks: {
    addAction: (action: string, callback: (...args: any[]) => void) => void;
  };
};

function mountReactWidget($scope: any) {
  const container = $scope.querySelector("#ifl_zambales_map");
  if (!container) return;

  const settings = container.dataset.settings
    ? JSON.parse(container.dataset.settings)
    : {};

  createRoot(document.getElementById("ifl_zambales_map")!).render(
    <StrictMode>
      <App settings={settings} />
    </StrictMode>,
  );
}

window.addEventListener("elementor/frontend/init", () => {
  elementorFrontend.hooks.addAction(
    "frontend/element_ready/zambales_map.default",
    ($scope: any) => {
      mountReactWidget($scope[0]);
    },
  );
});

// For local testing without Elementor
// const settings: Settings = {
//   height: 500,
//   zoomLevel: 9,
//   hoverColor: "#573CAF",
//   mapColor: "#573CAF55",
//   mapBorderColor: "#573CAF",
//   borderWeight: 3
// }

// createRoot(document.getElementById('ifl_zambales_map')!).render(
//   <StrictMode>
//     <App settings={settings} />
//   </StrictMode>,
// )
