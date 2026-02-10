import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import FeatureDetail from "./pages/FeatureDetail";
import ScenarioEditor from "./pages/ScenarioEditor";
import Components from "./pages/Components";
import ComponentEditor from "./pages/ComponentEditor";
import Healing from "./pages/Healing";
import Runs from "./pages/Runs";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/features/:id" element={<FeatureDetail />} />
        <Route path="/scenarios/:id" element={<ScenarioEditor />} />
        <Route path="/components" element={<Components />} />
        <Route path="/components/new" element={<ComponentEditor />} />
        <Route path="/components/:id/edit" element={<ComponentEditor />} />
        <Route path="/healing" element={<Healing />} />
        <Route path="/runs" element={<Runs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
