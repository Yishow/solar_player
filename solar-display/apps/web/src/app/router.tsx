import { Navigate, createBrowserRouter } from "react-router-dom";
import { LayoutShell } from "../layouts/LayoutShell";
import { Index } from "../pages/Index";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LayoutShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />
      },
      {
        path: "overview",
        element: <Index />
      },
      {
        path: "solar",
        element: <Index />
      },
      {
        path: "factory-circuit",
        element: <Index />
      },
      {
        path: "images",
        element: <Index />
      },
      {
        path: "sustainability",
        element: <Index />
      }
    ]
  }
]);
