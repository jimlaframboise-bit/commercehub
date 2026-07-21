import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './state.jsx'
import Layout from './components/Layout.jsx'
import Overview from './pages/Overview.jsx'
import { Campaigns, AdGroups, Targeting, SearchTerms, ShareOfVoice, Dayparting, BulkOperations, Tagging } from './pages/Ads.jsx'
import { Dsp, Audiences, Amc } from './pages/Dsp.jsx'
import { DigitalShelf, BuyBox, Products } from './pages/Commerce.jsx'
import { Rules, Budgets } from './pages/Automation.jsx'
import { Reports, Alerts, Settings } from './pages/Insights.jsx'

export default function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/ads/campaigns" element={<Campaigns />} />
          <Route path="/ads/tagging" element={<Tagging />} />
          <Route path="/ads/adgroups" element={<AdGroups />} />
          <Route path="/ads/targeting" element={<Targeting />} />
          <Route path="/ads/search-terms" element={<SearchTerms />} />
          <Route path="/ads/sov" element={<ShareOfVoice />} />
          <Route path="/ads/dayparting" element={<Dayparting />} />
          <Route path="/ads/bulk" element={<BulkOperations />} />
          <Route path="/dsp" element={<Dsp />} />
          <Route path="/dsp/audiences" element={<Audiences />} />
          <Route path="/dsp/amc" element={<Amc />} />
          <Route path="/commerce/shelf" element={<DigitalShelf />} />
          <Route path="/commerce/buybox" element={<BuyBox />} />
          <Route path="/commerce/products" element={<Products />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Overview />} />
        </Routes>
      </Layout>
    </AppProvider>
  )
}
