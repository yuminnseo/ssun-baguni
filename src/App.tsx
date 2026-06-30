import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { HomeDefault } from "./screens/HomeDefault";
import { HomeEditColor } from "./screens/HomeEditColor";
import { LegalDocumentPage } from "./screens/LegalDocument";

const router = createBrowserRouter([
  {
    path: "/home-defaultu9501",
    element: <HomeDefault />,
  },
  {
    path: "/privacy",
    element: <LegalDocumentPage documentId="privacy" />,
  },
  {
    path: "/terms",
    element: <LegalDocumentPage documentId="terms" />,
  },
  {
    path: "/home-defaultu95u4354u4449u4527u4365u4449u4363u4469u4355u4457u4540",
    element: <HomeDefault />,
  },
  {
    path: "/home-defaultu95u4366u4462u4352u4449u4370u4449u4352u4469",
    element: <HomeDefault />,
  },
  {
    path: "/home-edit-color",
    element: <HomeEditColor />,
  },
  {
    path: "/*",
    element: <HomeDefault />,
  },
]);

export const App = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};
