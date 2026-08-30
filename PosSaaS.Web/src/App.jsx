import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PuntoVenta from "./pages/PuntoVenta";
import Productos from "./pages/Productos";
import Inventario from "./pages/Inventario";
import Clientes from "./pages/Clientes";
import Ventas from "./pages/Ventas";
import Cajas from "./pages/Cajas";
import Configuracion from "./pages/Configuracion";
import Usuarios from "./pages/Usuarios";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            roles={[
              "Admin",
              "Supervisor",
              "Cajero",
            ]}
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pos"
        element={
          <ProtectedRoute
            roles={[
              "Admin",
              "Supervisor",
              "Cajero",
            ]}
          >
            <PuntoVenta />
          </ProtectedRoute>
        }
      />

      <Route
        path="/productos"
        element={
          <ProtectedRoute
            roles={[
              "Admin",
              "Supervisor",
            ]}
          >
            <Productos />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventario"
        element={
          <ProtectedRoute
            roles={[
              "Admin",
              "Supervisor",
            ]}
          >
            <Inventario />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes"
        element={
          <ProtectedRoute
            roles={[
              "Admin",
              "Supervisor",
              "Cajero",
            ]}
          >
            <Clientes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ventas"
        element={
          <ProtectedRoute
            roles={[
              "Admin",
              "Supervisor",
              "Cajero",
            ]}
          >
            <Ventas />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cajas"
        element={
          <ProtectedRoute
            roles={[
              "Admin",
              "Supervisor",
              "Cajero",
            ]}
          >
            <Cajas />
          </ProtectedRoute>
        }
      />

      <Route
        path="/usuarios"
        element={
          <ProtectedRoute
            roles={[
              "Admin",
            ]}
          >
            <Usuarios />
          </ProtectedRoute>
        }
      />

      <Route
        path="/configuracion"
        element={
          <ProtectedRoute
            roles={[
              "Admin",
            ]}
          >
            <Configuracion />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;