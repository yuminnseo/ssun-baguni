import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { HomeDefault } from "./screens/HomeDefault";
import { HomeDefaultScreen } from "./screens/HomeDefaultScreen";
import { HomeDefaultWrapper } from "./screens/HomeDefaultWrapper";

const router = createBrowserRouter([
  {
    path: "/*",
    element: <HomeDefault />,
  },
  {
    path: "/home-defaultu9501",
    element: <HomeDefault />,
  },
  {
    path: "/home-defaultu95u4354u4449u4527u4365u4449u4363u4469u4355u4457u4540",
    element: <HomeDefaultScreen />,
  },
  {
    path: "/home-defaultu95u4366u4462u4352u4449u4370u4449u4352u4469",
    element: <HomeDefaultWrapper />,
  },
]);

export const App = () => {
  return <RouterProvider router={router} />;
};
