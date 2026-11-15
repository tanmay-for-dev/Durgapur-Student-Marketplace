
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";

import Home from "./pages/home.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import Auth from "./pages/Auth.jsx";
import Sell from "./pages/Sell.jsx";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/sell" element={<Sell />} />
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-[#FFF9F5] p-10 text-center">
                <h1 className="text-3xl font-bold">Page not found</h1>
                <Link to="/" className="mt-4 inline-block text-orange-500">
                  Return to marketplace
                </Link>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
