import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, roles = [] }) {
  const token = localStorage.getItem("token");
  const rol = localStorage.getItem("rol");
  const userType = localStorage.getItem("userType");

  if (!token) {
    const esRutaSuperAdmin = roles.includes("SuperAdmin");

    return (
      <Navigate
        to={esRutaSuperAdmin ? "/superadmin/login" : "/login"}
        replace
      />
    );
  }

  if (roles.includes("SuperAdmin")) {
    if (rol !== "SuperAdmin" || userType !== "platform") {
      return <Navigate to="/superadmin/login" replace />;
    }

    return children;
  }

  if (userType === "platform") {
    return <Navigate to="/superadmin" replace />;
  }

  if (roles.length > 0 && !roles.includes(rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
