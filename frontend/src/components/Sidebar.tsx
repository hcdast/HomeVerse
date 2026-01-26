import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
  category: string;
}

const Sidebar = () => {
  const location = useLocation();

  const menuItems: MenuItem[] = [
    // 工作台
    { path: '/', label: '首页', icon: '🏠', category: '工作台' },
    { path: '/moments', label: '家庭动态', icon: '💬', category: '工作台' },
    { path: '/calendar', label: '家庭日历', icon: '📅', category: '工作台' },
    { path: '/anniversaries', label: '纪念日', icon: '🎉', category: '工作台' },
    { path: '/todos', label: '待办清单', icon: '✅', category: '工作台' },
    { path: '/reminders', label: '智能提醒', icon: '⏰', category: '工作台' },
    { path: '/goals', label: '家庭目标', icon: '🎯', category: '工作台' },
    { path: '/chores', label: '家务分工', icon: '🧹', category: '工作台' },
    
    // 生活管理
    { path: '/finance', label: '财务记账', icon: '💰', category: '生活管理' },
    { path: '/budgets', label: '预算规划', icon: '📊', category: '生活管理' },
    { path: '/shopping', label: '购物清单', icon: '🛒', category: '生活管理' },
    { path: '/recipes', label: '食谱库', icon: '🍳', category: '生活管理' },
    { path: '/health', label: '健康档案', icon: '🏥', category: '生活管理' },
    { path: '/growth', label: '成长记录', icon: '👶', category: '生活管理' },
    { path: '/contacts', label: '紧急联系人', icon: '📞', category: '生活管理' },
    { path: '/locations', label: '位置分享', icon: '📍', category: '生活管理' },
    { path: '/pets', label: '宠物管理', icon: '🐾', category: '生活管理' },
    { path: '/appliances', label: '家电管理', icon: '🔌', category: '生活管理' },
    { path: '/travels', label: '旅行计划', icon: '✈️', category: '生活管理' },
    { path: '/education', label: '教育管理', icon: '📚', category: '生活管理' },
    
    // 资料库
    { path: '/albums', label: '家庭相册', icon: '📷', category: '资料库' },
    { path: '/files', label: '文件管理', icon: '📁', category: '资料库' },
    { path: '/articles', label: '文章管理', icon: '📝', category: '资料库' },
    { path: '/wiki', label: '知识库', icon: '📖', category: '资料库' },
    { path: '/books', label: '家庭书架', icon: '📚', category: '资料库' },
    { path: '/family-tree', label: '家族树', icon: '🌳', category: '资料库' },
    
    // 工具
    { path: '/passwords', label: '密码管理', icon: '🔐', category: '工具' },
    { path: '/ai-tools', label: 'AI创作工具', icon: '✨', category: '工具' },
    { path: '/ai-settings', label: 'AI助手', icon: '🤖', category: '工具' },
    
    // 设置
    { path: '/family-members', label: '成员管理', icon: '👥', category: '设置' },
    { path: '/profile', label: '个人资料', icon: '👤', category: '设置' },
  ];

  // 按分类分组
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="menu-category">
            <div className="category-title">{category}</div>
            <nav className="menu-items">
              {items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-label">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;

