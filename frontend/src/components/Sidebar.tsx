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
    { path: '/calendar', label: '家庭日历', icon: '📅', category: '工作台' },
    { path: '/todos', label: '待办清单', icon: '✅', category: '工作台' },
    
    // 生活管理
    { path: '/finance', label: '财务记账', icon: '💰', category: '生活管理' },
    { path: '/recipes', label: '食谱库', icon: '🍳', category: '生活管理' },
    { path: '/health', label: '健康档案', icon: '🏥', category: '生活管理' },
    { path: '/growth', label: '成长记录', icon: '👶', category: '生活管理' },
    
    // 资料库
    { path: '/albums', label: '家庭相册', icon: '📷', category: '资料库' },
    { path: '/files', label: '文件管理', icon: '📁', category: '资料库' },
    { path: '/articles', label: '文章管理', icon: '📝', category: '资料库' },
    { path: '/wiki', label: '知识库', icon: '📚', category: '资料库' },
    
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

