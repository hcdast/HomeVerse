import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import Loading from './components/Loading';
import Layout from './components/Layout';

// 懒加载页面组件
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Albums = lazy(() => import('./pages/Albums'));
const Files = lazy(() => import('./pages/Files'));
const Articles = lazy(() => import('./pages/Articles'));
const Profile = lazy(() => import('./pages/Profile'));
const AiSettings = lazy(() => import('./pages/AiSettings'));
const FamilyMembers = lazy(() => import('./pages/FamilyMembers'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Search = lazy(() => import('./pages/Search'));

// 受保护的路由组件
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Layout /> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<Dashboard />} />
            <Route path="albums" element={<Albums />} />
            <Route path="files" element={<Files />} />
            <Route path="articles" element={<Articles />} />
            <Route path="family-members" element={<FamilyMembers />} />
            <Route path="ai-settings" element={<AiSettings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="search" element={<Search />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

