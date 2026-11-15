
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/home.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/product/:id"
          element={<ProductDetails />}
        />
        <Route
          path="*"
          element={
            <div className="p-10 text-center">
              <h1 className="text-3xl font-bold">
                Page not found
              </h1>
              <a href="/" className="text-orange-500">
                Return to marketplace
              </a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
