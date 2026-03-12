import { RouterProvider } from "react-router";
import { router } from "./routes";
import { F1DataProvider } from "./context/F1DataContext";

export default function App() {
  return (
    <F1DataProvider>
      <RouterProvider router={router} />
    </F1DataProvider>
  );
}