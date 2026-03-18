import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import Loading from './components/Loading';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalToast from './components/GlobalToast';
import AuthExpiredHandler from './components/AuthExpiredHandler';

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
// P0 新功能页面
const Shopping = lazy(() => import('./pages/Shopping'));
const Chores = lazy(() => import('./pages/Chores'));
const Contacts = lazy(() => import('./pages/Contacts'));
// P1 新功能页面
const Moments = lazy(() => import('./pages/Moments'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Anniversaries = lazy(() => import('./pages/Anniversaries'));
// P2 新功能页面
const Reminders = lazy(() => import('./pages/Reminders'));
const Goals = lazy(() => import('./pages/Goals'));
const Locations = lazy(() => import('./pages/Locations'));
// P2/P3 扩展功能页面
const Pets = lazy(() => import('./pages/Pets'));
const Appliances = lazy(() => import('./pages/Appliances'));
const Travels = lazy(() => import('./pages/Travels'));
const Education = lazy(() => import('./pages/Education'));
const FamilyTree = lazy(() => import('./pages/FamilyTree'));
const Books = lazy(() => import('./pages/Books'));
// 阶段2 新功能页面
const Chat = lazy(() => import('./pages/Chat'));
const Templates = lazy(() => import('./pages/Templates'));
const DataTransfer = lazy(() => import('./pages/DataTransfer'));
// P0 核心功能页面
const Points = lazy(() => import('./pages/Points'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Digest = lazy(() => import('./pages/Digest'));
// 阶段3 新功能页面
const MenuPlanner = lazy(() => import('./pages/MenuPlanner'));
const Voting = lazy(() => import('./pages/Voting'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const Favorites = lazy(() => import('./pages/Favorites'));
const TimeCapsule = lazy(() => import('./pages/TimeCapsule'));
const Challenges = lazy(() => import('./pages/Challenges'));
const NotFound = lazy(() => import('./pages/NotFound'));

// 受保护的路由组件（未登录时跳转登录页并带上 redirect，登录后可回到原页）
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Layout />;
  const redirect = encodeURIComponent(window.location.pathname + window.location.search || '/');
  return <Navigate to={`/login?redirect=${redirect}`} replace />;
};

function App() {
  return (
    <Router>
      <AuthExpiredHandler />
      <GlobalToast />
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<Dashboard />} />
            {/* 工作台 */}
            <Route path="chat" element={<Chat />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="todos" element={<Todos />} />
            {/* 生活管理 */}
            <Route path="finance" element={<Finance />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="health" element={<Health />} />
            <Route path="growth" element={<Growth />} />
            {/* P0 新功能 */}
            <Route path="shopping" element={<Shopping />} />
            <Route path="chores" element={<Chores />} />
            <Route path="contacts" element={<Contacts />} />
            {/* P1 新功能 */}
            <Route path="moments" element={<Moments />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="anniversaries" element={<Anniversaries />} />
            {/* P2 新功能 */}
            <Route path="reminders" element={<Reminders />} />
            <Route path="goals" element={<Goals />} />
            <Route path="locations" element={<Locations />} />
            {/* P2/P3 扩展功能 */}
            <Route path="pets" element={<Pets />} />
            <Route path="appliances" element={<Appliances />} />
            <Route path="travels" element={<Travels />} />
            <Route path="education" element={<Education />} />
            <Route path="family-tree" element={<FamilyTree />} />
            <Route path="books" element={<Books />} />
            {/* 资料库 */}
            <Route path="albums" element={<Albums />} />
            <Route path="files" element={<Files />} />
            <Route path="articles" element={<Articles />} />
            <Route path="wiki" element={<Wiki />} />
            {/* 工具 */}
            <Route path="passwords" element={<Passwords />} />
            <Route path="ai-tools" element={<AiTools />} />
            <Route path="ai-settings" element={<AiSettings />} />
            <Route path="templates" element={<Templates />} />
            <Route path="data-transfer" element={<DataTransfer />} />
            {/* P0 核心功能 */}
            <Route path="points" element={<Points />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="digest" element={<Digest />} />
            {/* 阶段3 新功能 */}
            <Route path="menu-planner" element={<MenuPlanner />} />
            <Route path="voting" element={<Voting />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="time-capsule" element={<TimeCapsule />} />
            <Route path="challenges" element={<Challenges />} />
            {/* 设置 */}
            <Route path="family-members" element={<FamilyMembers />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="search" element={<Search />} />
          </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;

