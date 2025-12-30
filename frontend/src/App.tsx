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
const AiTools = lazy(() => import('./pages/AiTools'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Search = lazy(() => import('./pages/Search'));
// 新增功能页面
const Calendar = lazy(() => import('./pages/Calendar'));
const Finance = lazy(() => import('./pages/Finance'));
const Recipes = lazy(() => import('./pages/Recipes'));
const Todos = lazy(() => import('./pages/Todos'));
const Health = lazy(() => import('./pages/Health'));
const Wiki = lazy(() => import('./pages/Wiki'));
const Passwords = lazy(() => import('./pages/Passwords'));
const Growth = lazy(() => import('./pages/Growth'));

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
            {/* 工作台 */}
            <Route path="calendar" element={<Calendar />} />
            <Route path="todos" element={<Todos />} />
            {/* 生活管理 */}
            <Route path="finance" element={<Finance />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="health" element={<Health />} />
            <Route path="growth" element={<Growth />} />
            {/* 资料库 */}
            <Route path="albums" element={<Albums />} />
            <Route path="files" element={<Files />} />
            <Route path="articles" element={<Articles />} />
            <Route path="wiki" element={<Wiki />} />
            {/* 工具 */}
            <Route path="passwords" element={<Passwords />} />
            <Route path="ai-tools" element={<AiTools />} />
            <Route path="ai-settings" element={<AiSettings />} />
            {/* 设置 */}
            <Route path="family-members" element={<FamilyMembers />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="search" element={<Search />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

