import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CreditDataProvider } from './context/CreditDataContext';
import NavBar from './components/NavBar';
import Landing from './screens/Landing';
import Consent from './screens/Consent';
import BorrowerDashboard from './screens/BorrowerDashboard';
import BankerDashboard from './screens/BankerDashboard';
import DrillDown from './screens/DrillDown';
import Simulator from './screens/Simulator';
import LiveScore from './screens/LiveScore';

export default function App() {
  return (
    <CreditDataProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/"          element={<Landing />} />
          <Route path="/consent"   element={<Consent />} />
          <Route path="/borrower"  element={<BorrowerDashboard />} />
          <Route path="/banker"    element={<BankerDashboard />} />
          <Route path="/drilldown" element={<DrillDown />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/live"      element={<LiveScore />} />
        </Routes>
      </BrowserRouter>
    </CreditDataProvider>
  );
}
