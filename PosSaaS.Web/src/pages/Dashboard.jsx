import AppLayout from "../layouts/AppLayout";

function Dashboard() {
  return (
    <AppLayout>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">
          Dashboard
        </h2>

        <p className="text-secondary mb-0">
          Resumen general del negocio.
        </p>
      </div>

      <div className="row g-4">
        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-secondary mb-2">
                    Ventas de hoy
                  </p>

                  <h3 className="fw-bold mb-0">
                    ₡0
                  </h3>
                </div>

                <div className="fs-3">
                  <i className="bi bi-cash-coin"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-secondary mb-2">
                    Transacciones
                  </p>

                  <h3 className="fw-bold mb-0">
                    0
                  </h3>
                </div>

                <div className="fs-3">
                  <i className="bi bi-receipt"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-secondary mb-2">
                    Productos
                  </p>

                  <h3 className="fw-bold mb-0">
                    0
                  </h3>
                </div>

                <div className="fs-3">
                  <i className="bi bi-box-seam"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-secondary mb-2">
                    Clientes
                  </p>

                  <h3 className="fw-bold mb-0">
                    0
                  </h3>
                </div>

                <div className="fs-3">
                  <i className="bi bi-people"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Dashboard;